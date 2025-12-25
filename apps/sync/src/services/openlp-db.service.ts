import Database from 'better-sqlite3';
import type { SongResponseDto } from '@openlp/shared';

export interface OpenLPSong {
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

export interface OpenLPVerse {
  id: number;
  song_id: number;
  verse_order: number;
  verse_type: string; // 'v1', 'v2', 'c', 'b', etc.
  verse_text: string;
}

export class OpenLPDatabaseService {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: false });
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Get all songs from OpenLP database
   */
  getAllSongs(): OpenLPSong[] {
    const stmt = this.db.prepare(`
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
        last_modified
      FROM songs
      ORDER BY id
    `);
    return stmt.all() as OpenLPSong[];
  }

  /**
   * Get song by ID
   */
  getSongById(id: number): OpenLPSong | null {
    const stmt = this.db.prepare(`
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
        last_modified
      FROM songs
      WHERE id = ?
    `);
    return (stmt.get(id) as OpenLPSong) || null;
  }

  /**
   * Get verses for a song
   */
  getVersesBySongId(songId: number): OpenLPVerse[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        song_id,
        verse_order,
        verse_type,
        verse_text
      FROM verses
      WHERE song_id = ?
      ORDER BY verse_order
    `);
    return stmt.all(songId) as OpenLPVerse[];
  }

  /**
   * Create or update a song in OpenLP database
   */
  upsertSong(song: SongResponseDto, openlpId?: number): number {
    const transaction = this.db.transaction(() => {
      // Prepare song data for OpenLP format
      const lyrics = this.formatSongLyrics(song);
      const searchTitle = song.searchTitle || song.title.toLowerCase().trim();
      // Generate search_lyrics from verses (lowercase for searching)
      const searchLyrics =
        song.searchLyrics ||
        (typeof song.verses === 'string' ? song.verses.toLowerCase().trim() : '');

      // Map MongoDB fields to OpenLP fields
      const alternateTitle = song.number || null;
      const copyright = song.copyright || null;
      const comments = song.comments || null;
      const ccliNumber = song.ccliNumber || song.number || null;

      if (openlpId) {
        // Update existing song
        const updateStmt = this.db.prepare(`
          UPDATE songs
          SET 
            title = ?,
            alternate_title = ?,
            lyrics = ?,
            search_title = ?,
            search_lyrics = ?,
            copyright = ?,
            comments = ?,
            ccli_number = ?,
            last_modified = datetime('now')
          WHERE id = ?
        `);
        updateStmt.run(
          song.title,
          alternateTitle,
          lyrics,
          searchTitle,
          searchLyrics,
          copyright,
          comments,
          ccliNumber,
          openlpId
        );

        // Verses are now stored in lyrics field as XML, no need for separate verses table
        return openlpId;
      } else {
        // Insert new song
        const insertStmt = this.db.prepare(`
          INSERT INTO songs (
            title,
            alternate_title,
            lyrics,
            search_title,
            search_lyrics,
            copyright,
            comments,
            ccli_number,
            last_modified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        const result = insertStmt.run(
          song.title,
          alternateTitle,
          lyrics,
          searchTitle,
          searchLyrics,
          copyright,
          comments,
          ccliNumber
        );

        const newSongId = Number(result.lastInsertRowid);

        // Verses are now stored in lyrics field as XML, no need for separate verses table
        return newSongId;
      }
    });

    return transaction();
  }

  /**
   * Format song lyrics for OpenLP format
   * OpenLP stores all verses in a single lyrics field with XML formatting
   * Format: <verse label="v1">text</verse>
   *
   * Verses are now stored as a single string in MongoDB (matching OpenLP's format).
   * We split by double newlines to get individual verses, then format as XML.
   */
  private formatSongLyrics(song: SongResponseDto): string {
    const parts: string[] = [];

    // Add main chorus if present (from song.chorus field)
    if (song.chorus) {
      parts.push(`<verse label="c">${this.escapeXml(song.chorus)}</verse>`);
    }

    // Parse verses string - split by double newlines to get individual verses
    // If no double newlines, treat entire string as one verse
    const versesString = song.verses || '';
    if (versesString.trim()) {
      // Split by double newlines (paragraph breaks)
      const verseBlocks = versesString.split(/\n\n+/).filter(block => block.trim());

      if (verseBlocks.length > 0) {
        // Each block becomes a verse (v1, v2, v3, etc.)
        verseBlocks.forEach((block, index) => {
          const verseNum = index + 1;
          parts.push(`<verse label="v${verseNum}">${this.escapeXml(block.trim())}</verse>`);
        });
      } else {
        // Single verse, no double newlines
        parts.push(`<verse label="v1">${this.escapeXml(versesString.trim())}</verse>`);
      }
    }

    return parts.join('');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Delete a song from OpenLP database
   */
  deleteSong(id: number): void {
    const transaction = this.db.transaction(() => {
      // Delete verses first (foreign key constraint)
      const deleteVersesStmt = this.db.prepare(`
        DELETE FROM verses WHERE song_id = ?
      `);
      deleteVersesStmt.run(id);

      // Delete song
      const deleteSongStmt = this.db.prepare(`
        DELETE FROM songs WHERE id = ?
      `);
      deleteSongStmt.run(id);
    });

    transaction();
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
