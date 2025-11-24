import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SongService } from '../songs/song.service';
import * as path from 'path';
import * as fs from 'fs';

// Use require for better-sqlite3 due to native module compatibility
const Database = require('better-sqlite3');

interface OpenLPSong {
  id: number;
  title: string;
  alternate_title?: string;
  lyrics: string;
  copyright?: string;
  comments?: string;
  ccli_number?: string;
  theme_name?: string;
  search_title?: string;
  search_lyrics?: string;
  last_modified?: string;
}

interface OpenLPVerse {
  id: number;
  song_id: number;
  verse_order: number;
  verse_type: string; // 'v1', 'v2', 'c', 'b', etc.
  verse_text: string;
}

async function migrateOpenLPToMongoDB() {
  // Get SQLite file path from command line or use default
  const sqlitePath = process.argv[2] || path.join(__dirname, '..', 'sqlite', 'songs.sqlite');
  
  console.log(`📂 Opening OpenLP database: ${sqlitePath}`);
  
  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ SQLite file not found: ${sqlitePath}`);
    process.exit(1);
  }

  // Open SQLite database
  const db = new Database(sqlitePath, { readonly: true });
  
  try {
    // Check what tables exist
    const tablesStmt = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    const tables = tablesStmt.all() as Array<{ name: string }>;
    console.log('📋 Available tables:', tables.map(t => t.name).join(', '));

    // Get all songs - try different possible table names
    let songsStmt;
    let openlpSongs: OpenLPSong[] = [];
    
    if (tables.some(t => t.name === 'songs')) {
      songsStmt = db.prepare(`
        SELECT 
          id,
          title,
          alternate_title,
          lyrics,
          copyright,
          comments,
          ccli_number,
          theme_name,
          search_title,
          search_lyrics,
          last_modified
        FROM songs
        ORDER BY id
      `);
      openlpSongs = songsStmt.all() as OpenLPSong[];
    } else if (tables.some(t => t.name === 'song')) {
      songsStmt = db.prepare(`
        SELECT 
          id,
          title,
          alternate_title,
          lyrics,
          copyright,
          comments,
          ccli_number,
          theme_name,
          search_title,
          search_lyrics,
          last_modified
        FROM song
        ORDER BY id
      `);
      openlpSongs = songsStmt.all() as OpenLPSong[];
    } else {
      console.error('❌ Could not find songs table. Available tables:', tables.map(t => t.name));
      process.exit(1);
    }
    
    console.log(`📊 Found ${openlpSongs.length} songs in OpenLP database`);

    // Get verses - try different possible table names
    let versesStmt: any = null;
    const possibleVerseTableNames = ['verses', 'verse', 'song_verses'];
    const verseTableName = tables.find(t => possibleVerseTableNames.includes(t.name))?.name;
    
    if (verseTableName) {
      try {
        // Verify the table actually exists and has the expected structure
        const testStmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`);
        const tableExists = testStmt.get(verseTableName);
        
        if (tableExists) {
          versesStmt = db.prepare(`
            SELECT 
              id,
              song_id,
              verse_order,
              verse_type,
              verse_text
            FROM ${verseTableName}
            WHERE song_id = ?
            ORDER BY verse_order
          `);
          console.log(`✅ Found verses table: ${verseTableName}`);
        }
      } catch (error: any) {
        console.log(`⚠️  Could not access verses table "${verseTableName}": ${error.message}`);
        console.log('⚠️  Will parse verses from lyrics field instead.');
        versesStmt = null;
      }
    } else {
      console.log('⚠️  No verses table found. Will parse verses from lyrics field.');
      versesStmt = null;
    }

    // Initialize NestJS app
    console.log('🚀 Initializing NestJS application...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const songService = app.get(SongService);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const openlpSong of openlpSongs) {
      try {
        // Get verses for this song
        let openlpVerses: OpenLPVerse[] = [];
        if (versesStmt) {
          openlpVerses = versesStmt.all(openlpSong.id) as OpenLPVerse[];
        }

        // Parse verses and chorus from OpenLP format
        const verses: Array<{ order: number; content: string; label?: string }> = [];
        let chorus: string | undefined;

        // PRIORITY: Always parse from lyrics XML field first (OpenLP stores everything there)
        if (openlpSong.lyrics) {
          const lyricsText = openlpSong.lyrics.trim();
          
          // Check if lyrics are in XML format (OpenLP format)
          if (lyricsText.startsWith('<') && lyricsText.includes('</verse>')) {
            // Parse XML format: <verse label="v1">text</verse>
            try {
              // Use a more robust regex that handles multiline content and escaped characters
              const verseRegex = /<verse\s+label="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/gi;
              const verseMatches = Array.from(lyricsText.matchAll(verseRegex));
              
              if (verseMatches.length > 0) {
                // Sort by order if we can determine it from labels
                const verseData = verseMatches.map((match) => {
                  const label = match[1]?.trim() || '';
                  let content = match[2]?.trim() || '';
                  
                  // Decode XML entities
                  content = content
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .replace(/&#39;/g, "'")
                    .replace(/&#x27;/g, "'");
                  
                  const labelLower = label.toLowerCase();
                  
                  // Extract order number from label (v1, v2, etc.)
                  let order = 0;
                  if (labelLower.startsWith('v')) {
                    const numMatch = labelLower.match(/\d+/);
                    order = numMatch ? parseInt(numMatch[0], 10) : 0;
                  } else if (labelLower.startsWith('c')) {
                    order = -1; // Chorus comes before verses
                  } else if (labelLower.startsWith('b')) {
                    order = 999; // Bridge comes after verses
                  } else if (labelLower.startsWith('p')) {
                    order = -2; // Pre-chorus comes before chorus
                  }
                  
                  return { label, labelLower, content, order };
                });
                
                // Sort: pre-chorus, chorus, verses (by number), bridge
                verseData.sort((a, b) => {
                  if (a.order === b.order) return 0;
                  if (a.order === -2) return -1; // Pre-chorus first
                  if (b.order === -2) return 1;
                  if (a.order === -1) return -1; // Chorus after pre-chorus
                  if (b.order === -1) return 1;
                  return a.order - b.order;
                });
                
                let verseOrder = 1;
                for (const verse of verseData) {
                  if (!verse.content) continue;
                  
                  // Handle different verse types
                  if (verse.labelLower.startsWith('c') || verse.labelLower === 'chorus' || verse.labelLower === 'c1' || verse.labelLower === 'c2') {
                    chorus = verse.content;
                  } else {
                    // Determine verse label
                    let verseLabel: string | undefined;
                    if (verse.labelLower.startsWith('v') || verse.labelLower.match(/^verse\s*\d*/i)) {
                      const verseNum = verse.labelLower.match(/\d+/)?.[0] || verseOrder.toString();
                      verseLabel = `Verse ${verseNum}`;
                    } else if (verse.labelLower.startsWith('b') || verse.labelLower === 'bridge') {
                      verseLabel = 'Bridge';
                    } else if (verse.labelLower.startsWith('p') || verse.labelLower === 'pre-chorus') {
                      verseLabel = 'Pre-Chorus';
                    } else if (verse.labelLower.startsWith('t') || verse.labelLower === 'tag') {
                      verseLabel = 'Tag';
                    } else {
                      verseLabel = verse.label || undefined;
                    }
                    
                    verses.push({
                      order: verseOrder++,
                      content: verse.content,
                      label: verseLabel,
                    });
                  }
                }
              }
            } catch (error) {
              console.warn(`⚠️  Failed to parse XML lyrics for song "${openlpSong.title}": ${error}`);
              // Fall through to verses table or plain text parsing
            }
          }
        }

        // Fallback: If no XML verses found, try verses table
        if (verses.length === 0 && openlpVerses.length > 0) {
          // Process verses from verses table
          for (const verse of openlpVerses) {
            const verseType = verse.verse_type.toLowerCase();
            
            if (verseType.startsWith('c') || verseType === 'chorus') {
              // This is a chorus
              chorus = verse.verse_text.trim();
            } else {
              // Regular verse
              const label = verseType.startsWith('v') 
                ? `Verse ${verse.verse_order}` 
                : verseType.startsWith('b')
                ? 'Bridge'
                : undefined;
              
              verses.push({
                order: verse.verse_order,
                content: verse.verse_text.trim(),
                label,
              });
            }
          }
        }

        // If still no verses found, try plain text format: [C], [V1], [V2], [B], etc.
        // Only try this if lyrics are NOT in XML format (already tried above)
        if (verses.length === 0 && openlpSong.lyrics && !chorus) {
          const lyricsText = openlpSong.lyrics.trim();
          
          // Skip if it's XML format (already tried)
          if (!lyricsText.startsWith('<') || !lyricsText.includes('</verse>')) {
            const verseRegex = /\[([CVB]\d*|Chorus|Verse\s*\d+|Bridge|Pre-Chorus|Tag)\]\s*\n?/gi;
            const parts = lyricsText.split(verseRegex).filter(p => p && p.trim());
            
            let currentVerseOrder = 1;
            let currentChorus: string | undefined;
            
            for (let i = 0; i < parts.length; i += 2) {
              const label = parts[i]?.trim();
              const content = parts[i + 1]?.trim() || '';
              
              if (!content) continue;
              
              const labelLower = label?.toLowerCase() || '';
              if (labelLower.startsWith('c') || labelLower === 'chorus') {
                currentChorus = content;
              } else {
                verses.push({
                  order: currentVerseOrder++,
                  content,
                  label: labelLower.startsWith('v') || labelLower.includes('verse')
                    ? `Verse ${currentVerseOrder - 1}`
                    : labelLower.startsWith('b') || labelLower === 'bridge'
                    ? 'Bridge'
                    : labelLower.includes('pre-chorus')
                    ? 'Pre-Chorus'
                    : labelLower === 'tag'
                    ? 'Tag'
                    : undefined,
                });
              }
            }
            
            if (currentChorus) {
              chorus = currentChorus;
            }
            
            // If still no structured format found, split by double newlines or just newlines
            if (verses.length === 0 && !chorus) {
              const lyricsLines = lyricsText.split(/\n\n+/).filter(line => line.trim());
              if (lyricsLines.length > 1) {
                // Multiple paragraphs
                lyricsLines.forEach((paragraph, index) => {
                  verses.push({
                    order: index + 1,
                    content: paragraph.trim(),
                  });
                });
              } else {
                // Single block, split by single newlines
                const lines = lyricsText.split('\n').filter(line => line.trim());
                lines.forEach((line, index) => {
                  verses.push({
                    order: index + 1,
                    content: line.trim(),
                  });
                });
              }
            }
          }
        }

        // Extract tags from theme_name if available
        const tags: string[] = [];
        if (openlpSong.theme_name) {
          // OpenLP themes might be comma-separated
          const themes = openlpSong.theme_name.split(',').map(t => t.trim()).filter(Boolean);
          tags.push(...themes);
        }

        // Extract number from alternate_title or ccli_number
        let number: string | undefined;
        if (openlpSong.alternate_title) {
          number = openlpSong.alternate_title;
        } else if (openlpSong.ccli_number) {
          number = openlpSong.ccli_number;
        }

        // Generate search_title for OpenLP compatibility (use existing or generate)
        const searchTitle = openlpSong.search_title 
          || (openlpSong.title || openlpSong.alternate_title || 'Untitled')
            .toLowerCase()
            .trim();

        // Combine verses into single string (separated by double newlines)
        // IMPORTANT: Preserve verse_order from verses table when available
        // If we have structured verses, combine them in verse_order; otherwise use raw lyrics
        let versesString: string;
        if (verses.length > 0) {
          // Sort by verse_order (from verses table) to preserve original order
          // verse_order is critical information from OpenLP
          versesString = verses
            .sort((a, b) => a.order - b.order) // Sort by verse_order
            .map(v => v.content.trim())
            .filter(content => content.length > 0)
            .join('\n\n');
        } else {
          // Fallback: use raw lyrics or empty string
          versesString = openlpSong.lyrics?.trim() || '';
        }
        
        // Generate search_lyrics for OpenLP compatibility (use existing or generate from verses)
        const searchLyrics = openlpSong.search_lyrics || versesString.toLowerCase().trim();

        // Create song DTO with OpenLP compatibility fields
        const createSongDto = {
          title: openlpSong.title || openlpSong.alternate_title || 'Untitled',
          number,
          language: 'en', // Default to English, can be detected later
          chorus,
          verses: versesString, // Single string field (preserves verse_order)
          tags: tags.length > 0 ? tags : undefined,
          // OpenLP compatibility fields
          copyright: openlpSong.copyright || undefined,
          comments: openlpSong.comments || undefined,
          ccliNumber: openlpSong.ccli_number || undefined,
          searchTitle,
          searchLyrics, // Lowercase lyrics for searching
        };

        // Check if song already exists (by title)
        const existingSongs = await songService.findAll({ 
          page: 1, 
          limit: 1, 
          search: createSongDto.title 
        });

        const exists = existingSongs.data.some(
          (s: any) => s.title.toLowerCase() === createSongDto.title.toLowerCase()
        );

        if (exists) {
          console.log(`⏭️  Skipping "${createSongDto.title}" (already exists)`);
          skipped++;
          continue;
        }

        // Create song in MongoDB
        await songService.create(createSongDto);
        console.log(`✅ Imported: "${createSongDto.title}" (${verses.length} verses${chorus ? ', chorus' : ''})`);
        imported++;

      } catch (error: any) {
        console.error(`❌ Error importing song "${openlpSong.title}":`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${openlpSongs.length}`);

    await app.close();
    db.close();
    
    console.log('\n✨ Migration completed!');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    db.close();
    process.exit(1);
  }
}

// Run migration
migrateOpenLPToMongoDB().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

