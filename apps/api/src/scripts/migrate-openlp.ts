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
  verse_order?: string; // String format: "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1" - defines verse sequence
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
  const sqlitePath =
    process.argv[2] || path.join(__dirname, '..', 'sqlite', 'songs.sqlite');

  console.log(`📂 Opening OpenLP database: ${sqlitePath}`);

  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ SQLite file not found: ${sqlitePath}`);
    process.exit(1);
  }

  // Open SQLite database in read-write mode to allow adding author relationships
  const db = new Database(sqlitePath);

  try {
    // Check what tables exist
    const tablesStmt = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    const tables = tablesStmt.all() as Array<{ name: string }>;
    console.log('📋 Available tables:', tables.map((t) => t.name).join(', '));

    // Get all songs - try different possible table names
    let songsStmt;
    let openlpSongs: OpenLPSong[] = [];

    // Check if verse_order column exists
    let tableInfoStmt;
    if (tables.some((t) => t.name === 'songs')) {
      tableInfoStmt = db.prepare(`PRAGMA table_info(songs)`);
    } else if (tables.some((t) => t.name === 'song')) {
      tableInfoStmt = db.prepare(`PRAGMA table_info(song)`);
    }

    const tableInfo = tableInfoStmt
      ? (tableInfoStmt.all() as Array<{ name: string; type: string }>)
      : [];
    const columnNames = tableInfo.map((col) => col.name);
    const hasVerseOrder = columnNames.includes('verse_order');
    console.log('📋 Songs table columns:', columnNames.join(', '));
    console.log(`ℹ️  Table has verse_order column: ${hasVerseOrder}`);

    if (tables.some((t) => t.name === 'songs')) {
      if (hasVerseOrder) {
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
            last_modified,
            verse_order
          FROM songs
          ORDER BY id
        `);
      } else {
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
      }
      openlpSongs = songsStmt.all() as OpenLPSong[];
    } else if (tables.some((t) => t.name === 'song')) {
      if (hasVerseOrder) {
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
            last_modified,
            verse_order
          FROM song
          ORDER BY id
        `);
      } else {
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
      }
      openlpSongs = songsStmt.all() as OpenLPSong[];
    } else {
      console.error(
        '❌ Could not find songs table. Available tables:',
        tables.map((t) => t.name),
      );
      process.exit(1);
    }

    console.log(`📊 Found ${openlpSongs.length} songs in OpenLP database`);

    // Get authors for songs - check if authors_songs table exists
    const hasAuthorsTable = tables.some((t) => t.name === 'authors');
    const hasAuthorsSongsTable = tables.some((t) => t.name === 'authors_songs');
    console.log(`ℹ️  Authors table exists: ${hasAuthorsTable}`);
    console.log(`ℹ️  Authors_songs table exists: ${hasAuthorsSongsTable}`);

    // Prepare statement to get authors for a song
    let getAuthorsStmt: any = null;
    if (hasAuthorsTable && hasAuthorsSongsTable) {
      try {
        getAuthorsStmt = db.prepare(`
          SELECT a.display_name
          FROM authors a
          INNER JOIN authors_songs as_rel ON a.id = as_rel.author_id
          WHERE as_rel.song_id = ?
          ORDER BY a.display_name
        `);
        console.log('✅ Authors query prepared successfully');
      } catch (error) {
        console.warn('⚠️  Could not prepare authors query:', error);
      }
    }

    // Prepare statements to add author relationships to authors_songs table
    let insertAuthorSongStmt: any = null;
    let getAuthorIdStmt: any = null;
    let insertAuthorStmt: any = null;
    if (hasAuthorsTable && hasAuthorsSongsTable) {
      try {
        // Get or create author with ID=1 (default "Nieznany")
        getAuthorIdStmt = db.prepare(`SELECT id FROM authors WHERE id = 1`);
        insertAuthorStmt = db.prepare(`
          INSERT OR IGNORE INTO authors (id, first_name, last_name, display_name)
          VALUES (1, '', 'Nieznany', 'Nieznany')
        `);
        // Insert author relationship: author_id=1, song_id, author_type='words'
        insertAuthorSongStmt = db.prepare(`
          INSERT OR IGNORE INTO authors_songs (author_id, song_id, author_type)
          VALUES (1, ?, 'words')
        `);
        console.log('✅ Author relationship statements prepared successfully');
      } catch (error) {
        console.warn(
          '⚠️  Could not prepare author relationship statements:',
          error,
        );
      }
    }

    // Get verses - try different possible table names
    let versesStmt: any = null;
    const possibleVerseTableNames = ['verses', 'verse', 'song_verses'];
    const verseTableName = tables.find((t) =>
      possibleVerseTableNames.includes(t.name),
    )?.name;

    if (verseTableName) {
      try {
        // Verify the table actually exists and has the expected structure
        const testStmt = db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        );
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
        console.log(
          `⚠️  Could not access verses table "${verseTableName}": ${error.message}`,
        );
        console.log('⚠️  Will parse verses from lyrics field instead.');
        versesStmt = null;
      }
    } else {
      console.log(
        '⚠️  No verses table found. Will parse verses from lyrics field.',
      );
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

        // Parse verses from OpenLP format (including chorus and bridge - all go to verses array)
        let verses: Array<{
          order: number;
          content: string;
          label?: string;
          originalLabel?: string;
        }> = [];

        // PRIORITY 1: Use verse_order string from songs table (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1")
        // This is the most reliable source of truth for verse sequence
        if (
          openlpSong.verse_order &&
          openlpSong.verse_order.trim() &&
          openlpSong.lyrics
        ) {
          const lyricsText = openlpSong.lyrics.trim();
          const verseOrderString = openlpSong.verse_order.trim();

          // Check if lyrics are in XML format
          if (lyricsText.startsWith('<') && lyricsText.includes('</verse>')) {
            try {
              // Parse XML to extract verses by label
              // Handle both: <verse label="v1">content</verse> and <verse type="v" label="1">content</verse>
              // Also handle CDATA: <verse type="v" label="1"><![CDATA[content]]></verse>
              const verseRegex =
                /<verse\s+(?:type=["']([^"']+)["']\s+)?label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/verse>/gi;
              const verseMatches = Array.from(lyricsText.matchAll(verseRegex));

              // Create a map of label -> content from XML
              const xmlContentMap = new Map<string, string>();
              verseMatches.forEach((match) => {
                const typeAttr = match[1]?.trim() || '';
                const label = match[2]?.trim() || '';
                let content = match[3]?.trim() || '';

                if (!content) return;

                // Extract CDATA if present: <![CDATA[content]]>
                const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
                if (cdataMatch && cdataMatch[1]) {
                  content = cdataMatch[1].trim();
                } else {
                  // No CDATA, decode XML entities
                  content = content
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .replace(/&#39;/g, "'")
                    .replace(/&#x27;/g, "'");
                }

                // Combine type and label if needed (e.g., type="v" label="1" -> "v1")
                let finalLabel = label;
                if (
                  typeAttr &&
                  label &&
                  !label.toLowerCase().startsWith(typeAttr.toLowerCase())
                ) {
                  finalLabel = `${typeAttr}${label}`;
                }

                const labelLower = finalLabel.toLowerCase();
                xmlContentMap.set(labelLower, content);
              });

              // IMPORTANT: verseOrder tells us HOW verses repeat, but we store each verse only ONCE in the database
              // verseOrder: "v1 c1 v2 c1 v3 c1" means: display v1, then c1, then v2, then c1 again, etc.
              // But in verses array, we store: [v1, c1, v2, v3] - each unique verse only once

              // First, build a map of all unique verses from XML (no duplicates)
              const uniqueVersesMap = new Map<
                string,
                {
                  content: string;
                  label: string;
                  originalLabel: string;
                  type: string;
                }
              >();

              // Process all verses from XML to build unique map
              verseMatches.forEach((match) => {
                const typeAttr = match[1]?.trim() || '';
                const label = match[2]?.trim() || '';
                let content = match[3]?.trim() || '';

                if (!content) return;

                // Extract CDATA if present
                const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
                if (cdataMatch && cdataMatch[1]) {
                  content = cdataMatch[1].trim();
                } else {
                  // No CDATA, decode XML entities
                  content = content
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .replace(/&#39;/g, "'")
                    .replace(/&#x27;/g, "'");
                }

                // Combine type and label if needed (e.g., type="v" label="1" -> "v1")
                let finalLabel = label;
                if (
                  typeAttr &&
                  label &&
                  !label.toLowerCase().startsWith(typeAttr.toLowerCase())
                ) {
                  finalLabel = `${typeAttr}${label}`;
                }

                const labelLower = finalLabel.toLowerCase();

                // Store unique verse (if not already stored)
                if (!uniqueVersesMap.has(labelLower)) {
                  let verseLabelFormatted: string | undefined;
                  if (labelLower.startsWith('v')) {
                    const verseNum = labelLower.match(/\d+/)?.[0];
                    verseLabelFormatted = verseNum
                      ? `Verse ${verseNum}`
                      : 'Verse';
                  } else if (labelLower.startsWith('c')) {
                    const chorusNum = labelLower.match(/\d+/)?.[0];
                    verseLabelFormatted = chorusNum
                      ? `Chorus ${chorusNum}`
                      : 'Chorus';
                  } else if (labelLower.startsWith('b')) {
                    const bridgeNum = labelLower.match(/\d+/)?.[0];
                    verseLabelFormatted = bridgeNum
                      ? `Bridge ${bridgeNum}`
                      : 'Bridge';
                  } else if (labelLower.startsWith('p')) {
                    const preChorusNum = labelLower.match(/\d+/)?.[0];
                    verseLabelFormatted = preChorusNum
                      ? `Pre-Chorus ${preChorusNum}`
                      : 'Pre-Chorus';
                  } else if (labelLower.startsWith('t')) {
                    const tagNum = labelLower.match(/\d+/)?.[0];
                    verseLabelFormatted = tagNum ? `Tag ${tagNum}` : 'Tag';
                  }

                  uniqueVersesMap.set(labelLower, {
                    content,
                    label: verseLabelFormatted || label,
                    originalLabel: labelLower, // Store original identifier (e.g., "v1", "c1") for verseOrder matching
                    type:
                      typeAttr ||
                      (labelLower.startsWith('v')
                        ? 'v'
                        : labelLower.startsWith('c')
                          ? 'c'
                          : labelLower.startsWith('b')
                            ? 'b'
                            : ''),
                  });
                }
              });

              // Now build verses array from unique verses map, sorted by type and number
              // This gives us: [Verse 1, Verse 2, Verse 3, Verse 4, Verse 5, Chorus 1] - each only once
              const uniqueVersesArray: Array<{
                order: number;
                content: string;
                label: string;
                originalLabel?: string;
              }> = [];
              let uniqueOrder = 1;

              // Sort unique verses: first all verses (v1, v2, v3...), then chorus (c1, c2...), then bridge, etc.
              const sortedUniqueLabels = Array.from(
                uniqueVersesMap.keys(),
              ).sort((a, b) => {
                const aType = a.charAt(0);
                const bType = b.charAt(0);
                const typeOrder: Record<string, number> = {
                  v: 1,
                  c: 2,
                  b: 3,
                  p: 4,
                  t: 5,
                };
                if (typeOrder[aType] !== typeOrder[bType]) {
                  return (typeOrder[aType] || 99) - (typeOrder[bType] || 99);
                }
                // Same type, sort by number
                const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
                const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
                return aNum - bNum;
              });

              for (const labelKey of sortedUniqueLabels) {
                const verseData = uniqueVersesMap.get(labelKey);
                if (verseData) {
                  uniqueVersesArray.push({
                    order: uniqueOrder++,
                    content: verseData.content,
                    label: verseData.label,
                    originalLabel: verseData.originalLabel, // Include original identifier for verseOrder matching
                  });
                }
              }

              verses = uniqueVersesArray;

              // If verse_order didn't match any verses, fall back to XML order (from fix-verse-order.ts)
              if (verses.length === 0 && verseOrderString) {
                console.warn(
                  `⚠️  No verses matched verse_order for "${openlpSong.title}", using XML order`,
                );
                console.warn(
                  `   Available labels in XML: ${Array.from(
                    xmlContentMap.keys(),
                  )
                    .filter((k) => !k.startsWith('c'))
                    .join(', ')}`,
                );
                console.warn(`   verse_order string: "${verseOrderString}"`);

                // IMPORTANT: Store each unique verse only ONCE (no duplicates)
                const fallbackUniqueVersesMap = new Map<
                  string,
                  {
                    content: string;
                    label: string;
                    originalLabel: string;
                    xmlIndex: number;
                  }
                >();

                // Use XML order (as they appear in XML)
                verseMatches.forEach((match, xmlIndex) => {
                  const typeAttr = match[1]?.trim() || '';
                  const label = match[2]?.trim() || '';
                  let content = match[3]?.trim() || '';

                  if (!content) return;

                  // Extract CDATA if present
                  const cdataMatch = content.match(
                    /<!\[CDATA\[([\s\S]*?)\]\]>/i,
                  );
                  if (cdataMatch && cdataMatch[1]) {
                    content = cdataMatch[1].trim();
                  } else {
                    // No CDATA, decode XML entities
                    content = content
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                      .replace(/&apos;/g, "'")
                      .replace(/&#39;/g, "'")
                      .replace(/&#x27;/g, "'");
                  }

                  // Combine type and label if needed
                  let finalLabel = label;
                  if (
                    typeAttr &&
                    label &&
                    !label.toLowerCase().startsWith(typeAttr.toLowerCase())
                  ) {
                    finalLabel = `${typeAttr}${label}`;
                  }

                  const labelLower = finalLabel.toLowerCase();

                  // Store unique verse only once (by label)
                  if (!fallbackUniqueVersesMap.has(labelLower)) {
                    let verseLabelFormatted: string | undefined;
                    if (labelLower.startsWith('v')) {
                      const verseNum =
                        labelLower.match(/\d+/)?.[0] || xmlIndex.toString();
                      verseLabelFormatted = `Verse ${verseNum}`;
                    } else if (labelLower.startsWith('c')) {
                      const chorusNum = labelLower.match(/\d+/)?.[0];
                      verseLabelFormatted = chorusNum
                        ? `Chorus ${chorusNum}`
                        : 'Chorus';
                    } else if (labelLower.startsWith('b')) {
                      const bridgeNum = labelLower.match(/\d+/)?.[0];
                      verseLabelFormatted = bridgeNum
                        ? `Bridge ${bridgeNum}`
                        : 'Bridge';
                    } else if (labelLower.startsWith('p')) {
                      const preChorusNum = labelLower.match(/\d+/)?.[0];
                      verseLabelFormatted = preChorusNum
                        ? `Pre-Chorus ${preChorusNum}`
                        : 'Pre-Chorus';
                    } else if (labelLower.startsWith('t')) {
                      const tagNum = labelLower.match(/\d+/)?.[0];
                      verseLabelFormatted = tagNum ? `Tag ${tagNum}` : 'Tag';
                    }

                    fallbackUniqueVersesMap.set(labelLower, {
                      content,
                      label: verseLabelFormatted || label,
                      originalLabel: labelLower, // Store original identifier (e.g., "v1", "c1") for verseOrder matching
                      xmlIndex,
                    });
                  }
                });

                // Convert map to array, sorted by XML order
                const sortedFallbackLabels = Array.from(
                  fallbackUniqueVersesMap.keys(),
                ).sort((a, b) => {
                  const aData = fallbackUniqueVersesMap.get(a)!;
                  const bData = fallbackUniqueVersesMap.get(b)!;
                  return aData.xmlIndex - bData.xmlIndex;
                });

                let fallbackOrder = 1;
                for (const labelKey of sortedFallbackLabels) {
                  const verseData = fallbackUniqueVersesMap.get(labelKey);
                  if (verseData) {
                    verses.push({
                      order: fallbackOrder++,
                      content: verseData.content,
                      label: verseData.label,
                      originalLabel: verseData.originalLabel, // Include original identifier for verseOrder matching
                    });
                  }
                }
              }
            } catch (error) {
              console.warn(
                `⚠️  Failed to parse verse_order for song "${openlpSong.title}": ${error}`,
              );
              // Fall through to other methods
            }
          }
        }

        // PRIORITY 2: If verses table exists with verse_order, use it as source of truth for order
        // Parse XML for content, but use verse_order from table for sorting
        if (
          verses.length === 0 &&
          openlpVerses.length > 0 &&
          openlpSong.lyrics
        ) {
          const lyricsText = openlpSong.lyrics.trim();

          // Check if lyrics are in XML format (OpenLP format)
          if (lyricsText.startsWith('<') && lyricsText.includes('</verse>')) {
            try {
              // Parse XML to get content
              // Handle both: <verse label="v1">content</verse> and <verse type="v" label="1">content</verse>
              // Also handle CDATA: <verse type="v" label="1"><![CDATA[content]]></verse>
              const verseRegex =
                /<verse\s+(?:type=["']([^"']+)["']\s+)?label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/verse>/gi;
              const verseMatches = Array.from(lyricsText.matchAll(verseRegex));

              // Create a map of label -> content from XML
              const xmlContentMap = new Map<string, string>();
              verseMatches.forEach((match) => {
                const typeAttr = match[1]?.trim() || '';
                const label = match[2]?.trim() || '';
                let content = match[3]?.trim() || '';

                if (!content) return;

                // Extract CDATA if present: <![CDATA[content]]>
                const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
                if (cdataMatch && cdataMatch[1]) {
                  content = cdataMatch[1].trim();
                } else {
                  // No CDATA, decode XML entities
                  content = content
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .replace(/&#39;/g, "'")
                    .replace(/&#x27;/g, "'");
                }

                // Combine type and label if needed (e.g., type="v" label="1" -> "v1")
                let finalLabel = label;
                if (
                  typeAttr &&
                  label &&
                  !label.toLowerCase().startsWith(typeAttr.toLowerCase())
                ) {
                  finalLabel = `${typeAttr}${label}`;
                }

                xmlContentMap.set(finalLabel.toLowerCase(), content);
              });

              // IMPORTANT: Store each unique verse only ONCE, even if it appears multiple times in verse_order
              // Use a map to track unique verses by their label
              const uniqueVersesMap = new Map<
                string,
                {
                  content: string;
                  label: string;
                  originalLabel: string;
                  verseOrder: number;
                }
              >();

              for (const verse of openlpVerses) {
                const verseType = verse.verse_type.toLowerCase();
                const verseLabel = verseType; // Use verse_type as label (v1, v2, c, b, etc.)

                // Get content from XML map if available, otherwise use verse_text
                let content =
                  xmlContentMap.get(verseLabel) || verse.verse_text.trim();

                if (!content) continue;

                // Store unique verse only once (by label)
                if (!uniqueVersesMap.has(verseLabel)) {
                  let label: string | undefined;
                  if (verseType.startsWith('v')) {
                    label = `Verse ${verse.verse_order}`;
                  } else if (
                    verseType.startsWith('c') ||
                    verseType === 'chorus'
                  ) {
                    const chorusNum = verseType.match(/\d+/)?.[0];
                    label = chorusNum ? `Chorus ${chorusNum}` : 'Chorus';
                  } else if (verseType.startsWith('b')) {
                    const bridgeNum = verseType.match(/\d+/)?.[0];
                    label = bridgeNum ? `Bridge ${bridgeNum}` : 'Bridge';
                  } else if (verseType.startsWith('p')) {
                    const preChorusNum = verseType.match(/\d+/)?.[0];
                    label = preChorusNum
                      ? `Pre-Chorus ${preChorusNum}`
                      : 'Pre-Chorus';
                  } else if (verseType.startsWith('t')) {
                    const tagNum = verseType.match(/\d+/)?.[0];
                    label = tagNum ? `Tag ${tagNum}` : 'Tag';
                  }

                  uniqueVersesMap.set(verseLabel, {
                    content,
                    label: label || verseLabel,
                    originalLabel: verseLabel, // Store original identifier (e.g., "v1", "c1") for verseOrder matching
                    verseOrder: verse.verse_order,
                  });
                }
              }

              // Convert map to array, sorted by type and verse_order
              const sortedUniqueLabels = Array.from(
                uniqueVersesMap.keys(),
              ).sort((a, b) => {
                const aData = uniqueVersesMap.get(a)!;
                const bData = uniqueVersesMap.get(b)!;
                return aData.verseOrder - bData.verseOrder;
              });

              let uniqueOrder = 1;
              for (const labelKey of sortedUniqueLabels) {
                const verseData = uniqueVersesMap.get(labelKey);
                if (verseData) {
                  verses.push({
                    order: uniqueOrder++,
                    content: verseData.content,
                    label: verseData.label,
                    originalLabel: verseData.originalLabel, // Include original identifier for verseOrder matching
                  });
                }
              }
            } catch (error) {
              console.warn(
                `⚠️  Failed to parse XML lyrics for song "${openlpSong.title}": ${error}`,
              );
              // Fall through to verses table only parsing
            }
          } else {
            // Not XML format, use verses table directly
            // IMPORTANT: Store each unique verse only ONCE
            const uniqueVersesMap = new Map<
              string,
              {
                content: string;
                label: string;
                originalLabel: string;
                verseOrder: number;
              }
            >();

            for (const verse of openlpVerses) {
              const verseType = verse.verse_type.toLowerCase();

              // Store unique verse only once (by verse_type)
              if (!uniqueVersesMap.has(verseType)) {
                let label: string | undefined;
                if (verseType.startsWith('v')) {
                  label = `Verse ${verse.verse_order}`;
                } else if (
                  verseType.startsWith('c') ||
                  verseType === 'chorus'
                ) {
                  const chorusNum = verseType.match(/\d+/)?.[0];
                  label = chorusNum ? `Chorus ${chorusNum}` : 'Chorus';
                } else if (verseType.startsWith('b')) {
                  const bridgeNum = verseType.match(/\d+/)?.[0];
                  label = bridgeNum ? `Bridge ${bridgeNum}` : 'Bridge';
                } else if (verseType.startsWith('p')) {
                  const preChorusNum = verseType.match(/\d+/)?.[0];
                  label = preChorusNum
                    ? `Pre-Chorus ${preChorusNum}`
                    : 'Pre-Chorus';
                } else if (verseType.startsWith('t')) {
                  const tagNum = verseType.match(/\d+/)?.[0];
                  label = tagNum ? `Tag ${tagNum}` : 'Tag';
                }

                uniqueVersesMap.set(verseType, {
                  content: verse.verse_text.trim(),
                  label: label || verseType,
                  originalLabel: verseType, // Store original identifier (e.g., "v1", "c1") for verseOrder matching
                  verseOrder: verse.verse_order,
                });
              }
            }

            // Convert map to array, sorted by verse_order
            const sortedUniqueLabels = Array.from(uniqueVersesMap.keys()).sort(
              (a, b) => {
                const aData = uniqueVersesMap.get(a)!;
                const bData = uniqueVersesMap.get(b)!;
                return aData.verseOrder - bData.verseOrder;
              },
            );

            let uniqueOrder = 1;
            for (const labelKey of sortedUniqueLabels) {
              const verseData = uniqueVersesMap.get(labelKey);
              if (verseData) {
                verses.push({
                  order: uniqueOrder++,
                  content: verseData.content,
                  label: verseData.label,
                });
              }
            }
          }
        }
        // PRIORITY 3: If no verse_order and no verses table, parse from XML lyrics (preserve XML order)
        else if (verses.length === 0 && openlpSong.lyrics) {
          const lyricsText = openlpSong.lyrics.trim();

          // Check if lyrics are in XML format (OpenLP format)
          if (lyricsText.startsWith('<') && lyricsText.includes('</verse>')) {
            try {
              // Parse XML format: <verse label="v1">text</verse> or <verse type="v" label="1">text</verse>
              // Also handle CDATA: <verse type="v" label="1"><![CDATA[content]]></verse>
              const verseRegex =
                /<verse\s+(?:type=["']([^"']+)["']\s+)?label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/verse>/gi;
              const verseMatches = Array.from(lyricsText.matchAll(verseRegex));

              if (verseMatches.length > 0) {
                // IMPORTANT: Store each unique verse only ONCE (no duplicates)
                const uniqueVersesMap = new Map<
                  string,
                  {
                    content: string;
                    label: string;
                    originalLabel: string;
                    xmlIndex: number;
                  }
                >();

                // Process verses in the order they appear in XML
                verseMatches.forEach((match, xmlIndex) => {
                  const typeAttr = match[1]?.trim() || '';
                  const label = match[2]?.trim() || '';
                  let content = match[3]?.trim() || '';

                  if (!content) return;

                  // Extract CDATA if present: <![CDATA[content]]>
                  const cdataMatch = content.match(
                    /<!\[CDATA\[([\s\S]*?)\]\]>/i,
                  );
                  if (cdataMatch && cdataMatch[1]) {
                    content = cdataMatch[1].trim();
                  } else {
                    // No CDATA, decode XML entities
                    content = content
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                      .replace(/&apos;/g, "'")
                      .replace(/&#39;/g, "'")
                      .replace(/&#x27;/g, "'");
                  }

                  // Combine type and label if needed (e.g., type="v" label="1" -> "v1")
                  let finalLabel = label;
                  if (
                    typeAttr &&
                    label &&
                    !label.toLowerCase().startsWith(typeAttr.toLowerCase())
                  ) {
                    finalLabel = `${typeAttr}${label}`;
                  }

                  const labelLower = finalLabel.toLowerCase();

                  // Store unique verse only once (by label)
                  if (!uniqueVersesMap.has(labelLower)) {
                    let verseLabel: string | undefined;
                    if (
                      labelLower.startsWith('v') ||
                      labelLower.match(/^verse\s*\d*/i)
                    ) {
                      const verseNum =
                        labelLower.match(/\d+/)?.[0] ||
                        (xmlIndex + 1).toString();
                      verseLabel = `Verse ${verseNum}`;
                    } else if (
                      labelLower.startsWith('c') ||
                      labelLower === 'chorus' ||
                      labelLower === 'c1' ||
                      labelLower === 'c2'
                    ) {
                      const chorusNum = labelLower.match(/\d+/)?.[0];
                      verseLabel = chorusNum ? `Chorus ${chorusNum}` : 'Chorus';
                    } else if (
                      labelLower.startsWith('b') ||
                      labelLower === 'bridge'
                    ) {
                      const bridgeNum = labelLower.match(/\d+/)?.[0];
                      verseLabel = bridgeNum ? `Bridge ${bridgeNum}` : 'Bridge';
                    } else if (
                      labelLower.startsWith('p') ||
                      labelLower === 'pre-chorus'
                    ) {
                      const preChorusNum = labelLower.match(/\d+/)?.[0];
                      verseLabel = preChorusNum
                        ? `Pre-Chorus ${preChorusNum}`
                        : 'Pre-Chorus';
                    } else if (
                      labelLower.startsWith('t') ||
                      labelLower === 'tag'
                    ) {
                      const tagNum = labelLower.match(/\d+/)?.[0];
                      verseLabel = tagNum ? `Tag ${tagNum}` : 'Tag';
                    } else {
                      verseLabel = label || undefined;
                    }

                    uniqueVersesMap.set(labelLower, {
                      content,
                      label: verseLabel || label,
                      originalLabel: labelLower, // Store original identifier (e.g., "v1", "c1") for verseOrder matching
                      xmlIndex,
                    });
                  }
                });

                // Convert map to array, sorted by XML order
                const sortedUniqueLabels = Array.from(
                  uniqueVersesMap.keys(),
                ).sort((a, b) => {
                  const aData = uniqueVersesMap.get(a)!;
                  const bData = uniqueVersesMap.get(b)!;
                  return aData.xmlIndex - bData.xmlIndex;
                });

                let uniqueOrder = 1;
                for (const labelKey of sortedUniqueLabels) {
                  const verseData = uniqueVersesMap.get(labelKey);
                  if (verseData) {
                    verses.push({
                      order: uniqueOrder++,
                      content: verseData.content,
                      label: verseData.label,
                    });
                  }
                }
              }
            } catch (error) {
              console.warn(
                `⚠️  Failed to parse XML lyrics for song "${openlpSong.title}": ${error}`,
              );
              // Fall through to plain text parsing
            }
          }
        }

        // If still no verses found, try plain text format: [C], [V1], [V2], [B], etc.
        // Only try this if lyrics are NOT in XML format (already tried above)
        if (verses.length === 0 && openlpSong.lyrics) {
          const lyricsText = openlpSong.lyrics.trim();

          // Skip if it's XML format (already tried)
          if (!lyricsText.startsWith('<') || !lyricsText.includes('</verse>')) {
            const verseRegex =
              /\[([CVB]\d*|Chorus|Verse\s*\d+|Bridge|Pre-Chorus|Tag)\]\s*\n?/gi;
            const parts = lyricsText
              .split(verseRegex)
              .filter((p) => p && p.trim());

            // IMPORTANT: Store each unique verse only ONCE (no duplicates)
            const plainTextUniqueVersesMap = new Map<
              string,
              {
                content: string;
                label: string;
                originalLabel: string;
                order: number;
              }
            >();
            let currentVerseOrder = 1;
            let currentChorus: string | undefined;

            for (let i = 0; i < parts.length; i += 2) {
              const label = parts[i]?.trim();
              const content = parts[i + 1]?.trim() || '';

              if (!content) continue;

              const labelLower = label?.toLowerCase() || '';

              // Store unique verse only once (by label)
              if (!plainTextUniqueVersesMap.has(labelLower)) {
                let verseLabel: string | undefined;
                if (labelLower.startsWith('c') || labelLower === 'chorus') {
                  const chorusNum = labelLower.match(/\d+/)?.[0];
                  verseLabel = chorusNum ? `Chorus ${chorusNum}` : 'Chorus';
                  // Also store first chorus in separate field for backward compatibility
                  if (!currentChorus) {
                    currentChorus = content;
                  }
                } else if (
                  labelLower.startsWith('v') ||
                  labelLower.includes('verse')
                ) {
                  const verseNum =
                    labelLower.match(/\d+/)?.[0] ||
                    currentVerseOrder.toString();
                  verseLabel = `Verse ${verseNum}`;
                } else if (
                  labelLower.startsWith('b') ||
                  labelLower === 'bridge'
                ) {
                  const bridgeNum = labelLower.match(/\d+/)?.[0];
                  verseLabel = bridgeNum ? `Bridge ${bridgeNum}` : 'Bridge';
                } else if (labelLower.includes('pre-chorus')) {
                  const preChorusNum = labelLower.match(/\d+/)?.[0];
                  verseLabel = preChorusNum
                    ? `Pre-Chorus ${preChorusNum}`
                    : 'Pre-Chorus';
                } else if (labelLower === 'tag') {
                  const tagNum = labelLower.match(/\d+/)?.[0];
                  verseLabel = tagNum ? `Tag ${tagNum}` : 'Tag';
                }

                plainTextUniqueVersesMap.set(labelLower, {
                  content,
                  label: verseLabel || label,
                  originalLabel: labelLower, // Store original identifier (e.g., "v1", "c1") for verseOrder matching
                  order: currentVerseOrder++,
                });
              }
            }

            // Convert map to array, sorted by order
            const sortedPlainTextLabels = Array.from(
              plainTextUniqueVersesMap.keys(),
            ).sort((a, b) => {
              const aData = plainTextUniqueVersesMap.get(a)!;
              const bData = plainTextUniqueVersesMap.get(b)!;
              return aData.order - bData.order;
            });

            let uniqueOrder = 1;
            for (const labelKey of sortedPlainTextLabels) {
              const verseData = plainTextUniqueVersesMap.get(labelKey);
              if (verseData) {
                verses.push({
                  order: uniqueOrder++,
                  content: verseData.content,
                  label: verseData.label,
                  originalLabel: verseData.originalLabel, // Include original identifier for verseOrder matching
                });
              }
            }

            // If still no structured format found, split by double newlines or just newlines
            if (verses.length === 0) {
              const lyricsLines = lyricsText
                .split(/\n\n+/)
                .filter((line) => line.trim());
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
                const lines = lyricsText
                  .split('\n')
                  .filter((line) => line.trim());
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
          const themes = openlpSong.theme_name
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
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
        const searchTitle =
          openlpSong.search_title ||
          (openlpSong.title || openlpSong.alternate_title || 'Untitled')
            .toLowerCase()
            .trim();

        // IMPORTANT: Preserve verse_order from SQLite - use verse_order string directly (1:1 transparent)
        // Sort verses by order to ensure correct sequence
        const sortedVerses =
          verses.length > 0
            ? verses.sort((a, b) => a.order - b.order) // Sort by verse_order
            : [];

        // Get verse_order string directly from SQLite (1:1 transparent with SQLite structure)
        // This is the source of truth for verse sequence (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1")
        const verseOrderString = openlpSong.verse_order || undefined;

        // Generate search_lyrics for OpenLP compatibility
        // Convert verses array to string for search
        const versesString = sortedVerses
          .map((v) => v.content.trim())
          .filter((content) => content.length > 0)
          .join('\n\n');
        const searchLyrics =
          openlpSong.search_lyrics || versesString.toLowerCase().trim();

        // IMPORTANT: Preserve exact XML from SQLite lyrics column (1:1 transparent)
        // Store the raw XML exactly as it appears in SQLite (with CDATA, type/label attributes, etc.)
        const lyricsXml =
          openlpSong.lyrics && openlpSong.lyrics.trim()
            ? openlpSong.lyrics.trim()
            : undefined;

        // Get authors for this song
        let authors: string | undefined = undefined;
        if (getAuthorsStmt) {
          try {
            const authorRows = getAuthorsStmt.all(openlpSong.id) as Array<{
              display_name: string;
            }>;
            if (authorRows && authorRows.length > 0) {
              authors = authorRows.map((a) => a.display_name).join(', ');
            }
          } catch (error) {
            console.warn(
              `⚠️  Could not get authors for song ${openlpSong.id}:`,
              error,
            );
          }
        }

        // Create song DTO with OpenLP compatibility fields
        // verses is now an array of objects with order (verse_order from OpenLP)
        const createSongDto = {
          title: openlpSong.title || openlpSong.alternate_title || 'Untitled',
          number,
          language: 'en', // Default to English, can be detected later
          verses: sortedVerses, // Array of objects with order (includes chorus, bridge, etc. as verse objects with type labels)
          verseOrder: verseOrderString, // verse_order string from SQLite (1:1 transparent: "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1")
          lyricsXml, // Exact XML from SQLite lyrics column (1:1 transparent - preserves CDATA, type/label attributes, etc.)
          tags: tags.length > 0 ? tags : undefined,
          // OpenLP compatibility fields
          copyright: openlpSong.copyright || undefined,
          comments: openlpSong.comments || undefined,
          ccliNumber: openlpSong.ccli_number || undefined,
          authors: authors || undefined, // Authors from OpenLP (comma-separated)
          searchTitle,
          searchLyrics, // Lowercase lyrics for searching
        };

        // Check if song already exists (by title)
        const existingSongs = await songService.findAll({
          page: 1,
          limit: 1,
          search: createSongDto.title,
        });

        const exists = existingSongs.data.some(
          (s: any) =>
            s.title.toLowerCase() === createSongDto.title.toLowerCase(),
        );

        if (exists) {
          console.log(`⏭️  Skipping "${createSongDto.title}" (already exists)`);
          skipped++;
          continue;
        }

        // Create song in MongoDB
        await songService.create(createSongDto);

        // Add author relationship to authors_songs table in OpenLP SQLite
        // This ensures every song has author_id=1 (Nieznany) with author_type='words'
        if (insertAuthorSongStmt && insertAuthorStmt) {
          try {
            // Ensure author with ID=1 exists (Nieznany)
            insertAuthorStmt.run();

            // Add relationship: author_id=1, song_id=openlpSong.id, author_type='words'
            insertAuthorSongStmt.run(openlpSong.id);
          } catch (error) {
            console.warn(
              `⚠️  Could not add author relationship for song ${openlpSong.id}:`,
              error,
            );
          }
        }

        const chorusCount = verses.filter((v) =>
          v.label?.toLowerCase().includes('chorus'),
        ).length;
        console.log(
          `✅ Imported: "${createSongDto.title}" (${verses.length} verses${chorusCount > 0 ? `, ${chorusCount} chorus(es)` : ''})`,
        );
        imported++;
      } catch (error: any) {
        console.error(
          `❌ Error importing song "${openlpSong.title}":`,
          error.message,
        );
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
