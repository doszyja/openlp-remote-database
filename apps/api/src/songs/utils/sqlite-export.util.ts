import type { SongResponseDto } from '@openlp/shared';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Use require for better-sqlite3 due to native module compatibility
const Database = require('better-sqlite3');

/**
 * Extended song type for SQLite export (with verses as string)
 */
interface SongForSqliteExport {
  id: string;
  title: string;
  number: string | null;
  language: string;
  verses: string; // String format for SQLite export
  versesArray?: Array<{
    order: number;
    content: string;
    label?: string;
    originalLabel?: string;
  }>;
  verseOrder?: string | null;
  lyricsXml?: string | null;
  tags: Array<{ id: string; name: string }>;
  copyright?: string | null;
  comments?: string | null;
  ccliNumber?: string | null;
  searchTitle?: string | null;
  searchLyrics?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Format song lyrics for OpenLP format
 * OpenLP stores all verses in a single lyrics field with XML formatting
 * Format: <verse label="v1">text</verse>
 */
export function formatSongLyrics(song: SongForSqliteExport): string {
  const parts: string[] = [];

  // If we have versesArray, use it with verseOrder to maintain proper sequence
  // This ensures we have control over duplicate prevention
  if ((song as any).versesArray && Array.isArray((song as any).versesArray)) {
    const versesArray = (song as any).versesArray as Array<{
      order: number;
      content: string;
      label?: string;
      originalLabel?: string;
    }>;

    // Sort by order
    const sortedVerses = [...versesArray].sort((a, b) => a.order - b.order);

    // Use verseOrder string if available to determine sequence and labels
    // IMPORTANT: verseOrder defines the display sequence, but we only store unique verses
    // (e.g., "v1 c1 v2 c1" means: show v1, then c1, then v2, then c1 again - but store c1 only once)
    if (song.verseOrder) {
      // Parse verseOrder string (e.g., "v1 c1 v2 c1")
      const verseOrderParts = song.verseOrder.split(/\s+/);
      const verseMap = new Map<string, (typeof sortedVerses)[0]>();

      // Build map of unique verses by their originalLabel (lowercase for matching)
      // IMPORTANT: Only store first occurrence of each verse to prevent duplicates
      sortedVerses.forEach((verse) => {
        if (verse.originalLabel) {
          const labelKey = verse.originalLabel.toLowerCase();
          // Only store first occurrence of each verse (prevent duplicates)
          if (!verseMap.has(labelKey)) {
            verseMap.set(labelKey, verse);
          }
        } else if (verse.label) {
          // Fallback: use label if originalLabel is not available
          const labelKey = verse.label.toLowerCase();
          if (!verseMap.has(labelKey)) {
            verseMap.set(labelKey, verse);
          }
        }
      });

      // Build XML in the order specified by verseOrder, but only add each unique verse once
      const addedVerses = new Set<string>(); // Track which verses have been added
      verseOrderParts.forEach((label) => {
        const labelKey = label.toLowerCase();
        const verse = verseMap.get(labelKey);
        if (verse && !addedVerses.has(labelKey)) {
          // Parse label to get type and number
          const verseLabel = verse.originalLabel || label;
          const { type, label: verseNum } = parseVerseLabel(verseLabel);
          parts.push(formatVerseXml(type, verseNum, verse.content));
          addedVerses.add(labelKey); // Mark as added
        }
      });

      // Add any verses not in verseOrder
      sortedVerses.forEach((verse) => {
        if (verse.originalLabel) {
          const labelKey = verse.originalLabel.toLowerCase();
          if (!addedVerses.has(labelKey)) {
            const { type, label: verseNum } = parseVerseLabel(
              verse.originalLabel,
            );
            parts.push(formatVerseXml(type, verseNum, verse.content));
            addedVerses.add(labelKey);
          }
        }
      });
    } else {
      // No verseOrder, use order field and generate labels
      sortedVerses.forEach((verse, index) => {
        const label = verse.originalLabel || `v${index + 1}`;
        const { type, label: verseNum } = parseVerseLabel(label);
        parts.push(formatVerseXml(type, verseNum, verse.content));
      });
    }
  } else if (song.lyricsXml && song.lyricsXml.trim()) {
    // If lyricsXml is available but no versesArray, parse it and remove duplicates
    // Parse XML to extract unique verses
    const lyricsText = song.lyricsXml.trim();
    const verseRegex =
      /<verse\s+(?:type=["']([^"']+)["']\s+)?label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/verse>/gi;
    const verseMatches = Array.from(lyricsText.matchAll(verseRegex));

    // Create a map of unique verses by label (lowercase for matching)
    const uniqueVersesMap = new Map<
      string,
      { label: string; content: string }
    >();

    verseMatches.forEach((match) => {
      const label = match[2]?.trim() || '';
      let content = match[3]?.trim() || '';

      if (!label || !content) return;

      // Extract CDATA if present
      const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
      if (cdataMatch && cdataMatch[1]) {
        content = cdataMatch[1].trim();
      } else {
        // Decode XML entities
        content = content
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
      }

      const labelKey = label.toLowerCase();
      // Only store first occurrence of each verse (prevent duplicates)
      if (!uniqueVersesMap.has(labelKey)) {
        uniqueVersesMap.set(labelKey, { label, content });
      }
    });

    // If verseOrder is available, use it to determine order
    if (song.verseOrder) {
      const verseOrderParts = song.verseOrder.split(/\s+/);
      const addedVerses = new Set<string>();

      verseOrderParts.forEach((label) => {
        const labelKey = label.toLowerCase();
        const verse = uniqueVersesMap.get(labelKey);
        if (verse && !addedVerses.has(labelKey)) {
          const { type, label: verseNum } = parseVerseLabel(verse.label);
          parts.push(formatVerseXml(type, verseNum, verse.content));
          addedVerses.add(labelKey);
        }
      });

      // Add any verses not in verseOrder
      uniqueVersesMap.forEach((verse, labelKey) => {
        if (!addedVerses.has(labelKey)) {
          const { type, label: verseNum } = parseVerseLabel(verse.label);
          parts.push(formatVerseXml(type, verseNum, verse.content));
        }
      });
    } else {
      // No verseOrder, add all unique verses in order they appear
      uniqueVersesMap.forEach((verse) => {
        const { type, label: verseNum } = parseVerseLabel(verse.label);
        parts.push(formatVerseXml(type, verseNum, verse.content));
      });
    }
  } else if (typeof song.verses === 'string' && song.verses.trim()) {
    // Fallback: parse verses string - split by double newlines to get individual verses
    const versesString = song.verses;
    const verseBlocks = versesString
      .split(/\n\n+/)
      .filter((block) => block.trim());

    if (verseBlocks.length > 0) {
      // Each block becomes a verse (v1, v2, v3, etc.)
      verseBlocks.forEach((block, index) => {
        const verseNum = index + 1;
        parts.push(formatVerseXml('v', verseNum.toString(), block.trim()));
      });
    } else {
      // Single verse, no double newlines
      parts.push(formatVerseXml('v', '1', versesString.trim()));
    }
  }

  // Wrap in OpenLP XML format with header
  if (parts.length > 0) {
    return `<?xml version='1.0' encoding='UTF-8'?>\n<song version="1.0"><lyrics>${parts.join('')}</lyrics></song>`;
  }

  return '';
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Parse verse label (e.g., "v1", "c1", "b1") into type and label
 * Returns { type: "v"|"c"|"b"|"p", label: "1" }
 */
function parseVerseLabel(originalLabel: string): {
  type: string;
  label: string;
} {
  const lower = originalLabel.toLowerCase().trim();

  // Match patterns like "v1", "c1", "b1", "p1", "verse1", "chorus1", etc.
  const match = lower.match(
    /^(v|verse|c|chorus|b|bridge|p|pre-chorus|prechorus)(\d+)$/,
  );
  if (match) {
    const typeChar = match[1].charAt(0); // First character
    const label = match[2];
    return { type: typeChar, label };
  }

  // If no match, try to extract type and number separately
  if (lower.startsWith('v')) {
    const num = lower.replace(/^v/, '') || '1';
    return { type: 'v', label: num };
  } else if (lower.startsWith('c')) {
    const num = lower.replace(/^c/, '') || '1';
    return { type: 'c', label: num };
  } else if (lower.startsWith('b')) {
    const num = lower.replace(/^b/, '') || '1';
    return { type: 'b', label: num };
  } else if (lower.startsWith('p')) {
    const num = lower.replace(/^p/, '') || '1';
    return { type: 'p', label: num };
  }

  // Default to verse
  return { type: 'v', label: '1' };
}

/**
 * Format verse as OpenLP XML format: <verse type="v" label="1"><![CDATA[...]]></verse>
 */
function formatVerseXml(type: string, label: string, content: string): string {
  return `<verse type="${type}" label="${label}"><![CDATA[${content}]]></verse>`;
}

/**
 * Create OpenLP SQLite database from MongoDB songs
 */
export async function createOpenLPSqliteDatabase(
  songs: SongForSqliteExport[],
): Promise<string> {
  // Create temporary file
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `openlp-export-${Date.now()}.sqlite`);

  // Create SQLite database
  const db = new Database(tempFile);
  db.pragma('foreign_keys = ON');

  // Create songs table - matching exact OpenLP schema from real database
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255) NOT NULL,
      alternate_title VARCHAR(255),
      lyrics TEXT NOT NULL,
      verse_order VARCHAR(128),
      copyright VARCHAR(255),
      comments TEXT,
      ccli_number VARCHAR(64),
      theme_name VARCHAR(128),
      search_title VARCHAR(255) NOT NULL,
      search_lyrics TEXT NOT NULL,
      create_date DATETIME,
      last_modified DATETIME,
      temporary BOOLEAN
    )
  `);

  // Create authors table (OpenLP authors) - matching real structure
  db.exec(`
    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name VARCHAR(128),
      last_name VARCHAR(128),
      display_name VARCHAR(255) NOT NULL
    )
  `);

  // Create authors_songs junction table (many-to-many relationship with author_type)
  db.exec(`
    CREATE TABLE IF NOT EXISTS authors_songs (
      author_id INTEGER NOT NULL,
      song_id INTEGER NOT NULL,
      author_type VARCHAR(255) NOT NULL,
      PRIMARY KEY (author_id, song_id, author_type),
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  // Create topics table (OpenLP topics - separate from theme_name in songs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(128) NOT NULL
    )
  `);

  // Create songs_topics junction table (many-to-many relationship)
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs_topics (
      song_id INTEGER NOT NULL,
      topic_id INTEGER NOT NULL,
      PRIMARY KEY (song_id, topic_id),
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    )
  `);

  // Create song_books table (OpenLP songbooks)
  db.exec(`
    CREATE TABLE IF NOT EXISTS song_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(128) NOT NULL,
      publisher VARCHAR(128)
    )
  `);

  // Create songs_songbooks junction table (many-to-many relationship with entry)
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs_songbooks (
      songbook_id INTEGER NOT NULL,
      song_id INTEGER NOT NULL,
      entry VARCHAR(255) NOT NULL,
      PRIMARY KEY (songbook_id, song_id, entry),
      FOREIGN KEY (songbook_id) REFERENCES song_books(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  // Create media_files table (OpenLP media files)
  db.exec(`
    CREATE TABLE IF NOT EXISTS media_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id INTEGER,
      file_path VARCHAR NOT NULL,
      type VARCHAR(64) NOT NULL,
      weight INTEGER,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  // Create metadata table (OpenLP metadata)
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key VARCHAR(64) NOT NULL PRIMARY KEY,
      value TEXT
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_songs_search_title ON songs(search_title);
    CREATE INDEX IF NOT EXISTS idx_authors_songs_song_id ON authors_songs(song_id);
    CREATE INDEX IF NOT EXISTS idx_authors_songs_author_id ON authors_songs(author_id);
    CREATE INDEX IF NOT EXISTS idx_songs_topics_song_id ON songs_topics(song_id);
    CREATE INDEX IF NOT EXISTS idx_songs_topics_topic_id ON songs_topics(topic_id);
    CREATE INDEX IF NOT EXISTS idx_songs_songbooks_song_id ON songs_songbooks(song_id);
    CREATE INDEX IF NOT EXISTS idx_songs_songbooks_songbook_id ON songs_songbooks(songbook_id);
    CREATE INDEX IF NOT EXISTS idx_media_files_song_id ON media_files(song_id);
  `);

  // Insert songs - column order matches OpenLP structure from real database
  const insertSongStmt = db.prepare(`
    INSERT INTO songs (
      title,
      alternate_title,
      lyrics,
      verse_order,
      copyright,
      comments,
      ccli_number,
      theme_name,
      search_title,
      search_lyrics,
      create_date,
      last_modified,
      temporary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)
  `);

  // Prepare statements for authors
  const insertAuthorStmt = db.prepare(`
    INSERT OR IGNORE INTO authors (first_name, last_name, display_name)
    VALUES (?, ?, ?)
  `);

  const getAuthorIdStmt = db.prepare(`
    SELECT id FROM authors WHERE display_name = ?
  `);

  const insertAuthorSongStmt = db.prepare(`
    INSERT OR IGNORE INTO authors_songs (author_id, song_id, author_type)
    VALUES (?, ?, ?)
  `);

  const insertedSongIds: number[] = [];

  const transaction = db.transaction((songsToInsert: SongForSqliteExport[]) => {
    for (const song of songsToInsert) {
      // Format lyrics as XML
      const lyrics = formatSongLyrics(song);

      // Map MongoDB fields to OpenLP fields
      const alternateTitle = song.number || null;
      const copyright = song.copyright || null;
      const comments = song.comments || null;
      const ccliNumber = song.ccliNumber || song.number || null;
      const searchTitle = song.searchTitle || song.title.toLowerCase().trim();
      const searchLyrics =
        song.searchLyrics ||
        (typeof song.verses === 'string'
          ? song.verses.toLowerCase().trim()
          : '');

      // Join tags for theme_name
      const themeName =
        song.tags && song.tags.length > 0
          ? song.tags.map((tag: any) => tag.name || tag).join(', ')
          : null;

      // Insert in the same order as column list (matching OpenLP structure)
      insertSongStmt.run(
        song.title, // title
        alternateTitle, // alternate_title
        lyrics, // lyrics
        song.verseOrder || null, // verse_order
        copyright, // copyright
        comments, // comments
        ccliNumber, // ccli_number
        themeName, // theme_name
        searchTitle, // search_title
        searchLyrics, // search_lyrics
        // create_date and last_modified are set by datetime('now') in SQL
        // temporary is set to 0 (false) in SQL
      );

      // Get the inserted song ID
      const songId = db.lastInsertRowid as number;
      insertedSongIds.push(songId);
    }
  });

  transaction(songs);

  // Create default author and assign all songs to it
  // Use "Nieznany" to match XML export format
  const defaultAuthorDisplayName = 'Nieznany';
  const defaultAuthorFirstName = '';
  const defaultAuthorLastName = 'Nieznany';
  const defaultAuthorType = 'words'; // Default author type: "words", "music", "words+music", or ""

  // Insert default author (if not exists)
  insertAuthorStmt.run(
    defaultAuthorFirstName,
    defaultAuthorLastName,
    defaultAuthorDisplayName,
  );

  // Get the default author ID
  const defaultAuthor = getAuthorIdStmt.get(defaultAuthorDisplayName) as
    | {
        id: number;
      }
    | undefined;

  if (defaultAuthor && insertedSongIds.length > 0) {
    // Assign all songs to the default author
    const assignAuthorTransaction = db.transaction((songIds: number[]) => {
      for (const songId of songIds) {
        insertAuthorSongStmt.run(defaultAuthor.id, songId, defaultAuthorType);
      }
    });

    assignAuthorTransaction(insertedSongIds);
  }

  db.close();

  return tempFile;
}
