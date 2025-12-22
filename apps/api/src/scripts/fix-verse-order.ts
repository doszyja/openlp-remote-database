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
  lyrics: string;
  verse_order?: string; // String format: "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1" - defines verse sequence
}

async function fixVerseOrder() {
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

    // First, check the structure of the songs table to see if verse_order column exists
    let tableInfoStmt;
    if (tables.some(t => t.name === 'songs')) {
      tableInfoStmt = db.prepare(`PRAGMA table_info(songs)`);
    } else if (tables.some(t => t.name === 'song')) {
      tableInfoStmt = db.prepare(`PRAGMA table_info(song)`);
    } else {
      console.error('❌ Could not find songs table. Available tables:', tables.map(t => t.name));
      process.exit(1);
    }
    
    const tableInfo = tableInfoStmt.all() as Array<{ name: string; type: string }>;
    const columnNames = tableInfo.map(col => col.name);
    console.log('📋 Songs table columns:', columnNames.join(', '));
    
    const hasVerseOrder = columnNames.includes('verse_order');
    console.log(`ℹ️  Table has verse_order column: ${hasVerseOrder}`);

    // Get all songs with their IDs and lyrics (XML format)
    let songsStmt;
    let openlpSongs: OpenLPSong[] = [];
    
    if (tables.some(t => t.name === 'songs')) {
      if (hasVerseOrder) {
        songsStmt = db.prepare(`
          SELECT id, title, lyrics, verse_order
          FROM songs
          ORDER BY id
        `);
      } else {
        songsStmt = db.prepare(`
          SELECT id, title, lyrics
          FROM songs
          ORDER BY id
        `);
      }
      openlpSongs = songsStmt.all() as OpenLPSong[];
    } else if (tables.some(t => t.name === 'song')) {
      if (hasVerseOrder) {
        songsStmt = db.prepare(`
          SELECT id, title, lyrics, verse_order
          FROM song
          ORDER BY id
        `);
      } else {
        songsStmt = db.prepare(`
          SELECT id, title, lyrics
          FROM song
          ORDER BY id
        `);
      }
      openlpSongs = songsStmt.all() as OpenLPSong[];
    } else {
      console.error('❌ Could not find songs table. Available tables:', tables.map(t => t.name));
      process.exit(1);
    }
    
    console.log(`📊 Found ${openlpSongs.length} songs in OpenLP database`);

    // In OpenLP, verses are stored in the lyrics column as XML, not in a separate table
    // We need to parse the XML and preserve the order of verses as they appear in the XML
    console.log('ℹ️  Verses are stored in lyrics column as XML format');

    // Initialize NestJS app
    console.log('🚀 Initializing NestJS application...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const songService = app.get(SongService);
    const songModel = (songService as any).songModel;

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let notFound = 0;

    for (const openlpSong of openlpSongs) {
      try {
        // Get lyrics from SQLite (contains XML with verses)
        if (!openlpSong.lyrics || !openlpSong.lyrics.trim()) {
          console.log(`⏭️  Skipping "${openlpSong.title}" (no lyrics in SQLite)`);
          skipped++;
          continue;
        }

        // Find song in MongoDB - try by openlpMapping.openlpId first, then by title
        let mongoSong = await songModel.findOne({
          'openlpMapping.openlpId': openlpSong.id,
          deletedAt: null,
        });

        // If not found by ID, try to match by title (case-insensitive)
        if (!mongoSong) {
          mongoSong = await songModel.findOne({
            title: { $regex: new RegExp(`^${openlpSong.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            deletedAt: null,
          });
        }

        if (!mongoSong) {
          // Only log first few not found to avoid spam
          if (notFound < 5) {
            console.log(`⚠️  Song not found in MongoDB: "${openlpSong.title}" (OpenLP ID: ${openlpSong.id})`);
          }
          notFound++;
          continue;
        }

        // Parse verses from XML lyrics
        const lyricsText = openlpSong.lyrics.trim();
        const versesMap = new Map<string, { content: string; label: string; isChorus: boolean }>();
        let chorus: string | undefined;

        // Check if lyrics are in XML format
        if (!lyricsText.startsWith('<') || !lyricsText.includes('</verse>')) {
          console.log(`⚠️  Song "${openlpSong.title}" has non-XML lyrics format, skipping`);
          skipped++;
          continue;
        }

        // Parse XML to extract verses by label
        const verseRegex = /<verse\s+([^>]+)>([\s\S]*?)<\/verse>/gi;
        const verseMatches = Array.from(lyricsText.matchAll(verseRegex));
        
        if (verseMatches.length === 0) {
          console.log(`⏭️  Skipping "${openlpSong.title}" (no verses in XML)`);
          skipped++;
          continue;
        }

        // Extract all verses from XML and store by label
        // Also store multiple variations of the same label for flexible matching
        verseMatches.forEach((match) => {
          const attributes = match[1] || '';
          let content = match[2]?.trim() || '';
          
          if (!content) return;
          
          // Decode XML entities
          content = content
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'");
          
          // Extract label from attributes
          const labelMatch = attributes.match(/label=["']([^"']+)["']/i);
          const label = labelMatch ? labelMatch[1].trim() : '';
          
          if (!label) return;
          
          const labelLower = label.toLowerCase();
          const isChorus = labelLower.startsWith('c') || labelLower === 'chorus';
          
          if (isChorus) {
            // Store chorus separately
            chorus = content;
          } else {
            // Store verse by label (e.g., "v1", "v2", "b", etc.)
            versesMap.set(labelLower, {
              content,
              label,
              isChorus: false,
            });
            
            // Also store variations for flexible matching
            // Extract number if present (e.g., "Verse 1" -> "v1", "verse1" -> "v1")
            const numberMatch = labelLower.match(/\d+/);
            if (numberMatch) {
              const num = numberMatch[0];
              // Store as "v1", "v2", etc. for matching with verse_order
              versesMap.set(`v${num}`, {
                content,
                label,
                isChorus: false,
              });
            }
          }
        });

        // Parse verse_order string (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1")
        // This defines the exact sequence of verses
        if (!openlpSong.verse_order || !openlpSong.verse_order.trim()) {
          console.log(`⚠️  Song "${openlpSong.title}" has no verse_order, skipping`);
          skipped++;
          continue;
        }

        // Get verse_order string directly from SQLite (1:1 transparent with SQLite structure)
        const verseOrderString = openlpSong.verse_order.trim();
        // Split by spaces to get sequence: ["v1", "c1", "v2", "c1", ...]
        const verseSequence = verseOrderString.split(/\s+/).filter(s => s.trim());
        
        // Build verses array in the order specified by verse_order string
        const versesArray: Array<{ order: number; content: string; label: string; isChorus: boolean }> = [];
        let verseOrderCounter = 1; // Track order for non-chorus verses
        
        for (const verseLabel of verseSequence) {
          const labelLower = verseLabel.toLowerCase();
          
          // Skip chorus in verse_order (we handle it separately)
          if (labelLower.startsWith('c') || labelLower === 'chorus') {
            continue; // Chorus is already stored separately
          }
          
              // Find verse by label - try multiple variations
              let verse = versesMap.get(labelLower);
              
              // If not found, try variations (v1 -> verse1, verse 1, Verse 1, etc.)
              if (!verse) {
                // Try with "verse" prefix
                const variations = [
                  labelLower.replace(/^v(\d+)$/, 'verse$1'), // v1 -> verse1
                  labelLower.replace(/^v(\d+)$/, 'verse $1'), // v1 -> verse 1
                  labelLower.replace(/^v(\d+)$/, 'Verse $1'), // v1 -> Verse 1
                  labelLower.replace(/^v(\d+)$/, 'Verse$1'), // v1 -> Verse1
                ];
                
                for (const variation of variations) {
                  verse = versesMap.get(variation);
                  if (verse) break;
                }
              }
              
              // If still not found, try to find by number only (extract number from label)
              if (!verse && labelLower.match(/^v\d+$/)) {
                const verseNum = labelLower.match(/\d+/)?.[0];
                if (verseNum) {
                  // Try to find any verse with this number in label
                  for (const [mapLabel, mapVerse] of versesMap.entries()) {
                    if (mapLabel.includes(verseNum) && !mapVerse.isChorus) {
                      verse = mapVerse;
                      break;
                    }
                  }
                }
              }
              
              if (verse) {
                versesArray.push({
                  order: verseOrderCounter++,
                  content: verse.content,
                  label: verse.label,
                  isChorus: false,
                });
              } else {
                console.warn(`⚠️  Verse label "${verseLabel}" not found in XML for song "${openlpSong.title}" (tried: ${labelLower}, variations)`);
              }
        }
        
        // If verse_order didn't match any verses, fall back to XML order
        if (versesArray.length === 0) {
          console.warn(`⚠️  No verses matched verse_order for "${openlpSong.title}", using XML order`);
          console.warn(`   Available labels in XML: ${Array.from(versesMap.keys()).filter(k => !versesMap.get(k)?.isChorus).join(', ')}`);
          console.warn(`   verse_order string: "${verseOrderString}"`);
          
          // Use XML order (as they appear in XML)
          let xmlOrder = 1;
          verseMatches.forEach((match) => {
            const attributes = match[1] || '';
            const labelMatch = attributes.match(/label=["']([^"']+)["']/i);
            const label = labelMatch ? labelMatch[1].trim() : '';
            if (!label) return;
            
            const labelLower = label.toLowerCase();
            const isChorus = labelLower.startsWith('c') || labelLower === 'chorus';
            
            if (!isChorus) {
              const verse = versesMap.get(labelLower);
              if (verse) {
                versesArray.push({
                  order: xmlOrder++,
                  content: verse.content,
                  label: verse.label,
                  isChorus: false,
                });
              }
            }
          });
        }

        // Build verses array with order preserved (verse_order from SQLite XML order)
        // Verses are already sorted by order
        const versesForMongo = versesArray.map(v => ({
          order: v.order,
          content: v.content,
          label: v.label,
        }));

        // verseOrderString is already defined above (line 230) - use it directly

        // Generate search_lyrics from verse content
        const versesString = versesForMongo
          .map(v => v.content)
          .filter(content => content.length > 0)
          .join('\n\n');

        // Update song in MongoDB
        const updateData: any = {
          verses: versesForMongo, // Array of objects with order (verse_order preserved)
          verseOrder: verseOrderString, // verse_order string from SQLite (1:1 transparent: "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1")
          searchLyrics: versesString.toLowerCase().trim(),
        };

        // Update chorus if it exists
        if (chorus) {
          updateData.chorus = chorus;
        }

        await songModel.updateOne(
          { _id: mongoSong._id },
          { $set: updateData }
        );

        // Log order information for verification
        const orderInfo = versesArray.map(v => `${v.label || 'v' + v.order}(order:${v.order})`).join(', ');
        console.log(`✅ Updated: "${openlpSong.title}" (${versesArray.length} verses${chorus ? ', chorus' : ''}) [${orderInfo}]`);
        updated++;

      } catch (error: any) {
        console.error(`❌ Error updating song "${openlpSong.title}":`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Fix Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ⚠️  Not found in MongoDB: ${notFound}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${openlpSongs.length}`);

    await app.close();
    db.close();
    
    console.log('\n✨ Verse order fix completed!');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Fix failed:', error);
    db.close();
    process.exit(1);
  }
}

// Run fix
fixVerseOrder().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

