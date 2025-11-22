import Database from 'better-sqlite3';
import type { SongResponseDto, Verse } from '@openlp/shared';

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
      const searchTitle = song.title.toLowerCase().trim();

      if (openlpId) {
        // Update existing song
        const updateStmt = this.db.prepare(`
          UPDATE songs
          SET 
            title = ?,
            alternate_title = ?,
            lyrics = ?,
            search_title = ?,
            last_modified = datetime('now')
          WHERE id = ?
        `);
        updateStmt.run(
          song.title,
          song.number || null,
          lyrics,
          searchTitle,
          openlpId
        );

        // Delete existing verses
        const deleteVersesStmt = this.db.prepare(`
          DELETE FROM verses WHERE song_id = ?
        `);
        deleteVersesStmt.run(openlpId);

        // Insert new verses
        this.insertVerses(openlpId, song.verses);

        return openlpId;
      } else {
        // Insert new song
        const insertStmt = this.db.prepare(`
          INSERT INTO songs (
            title,
            alternate_title,
            lyrics,
            search_title,
            last_modified
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `);
        const result = insertStmt.run(
          song.title,
          song.number || null,
          lyrics,
          searchTitle
        );

        const newSongId = Number(result.lastInsertRowid);

        // Insert verses
        this.insertVerses(newSongId, song.verses);

        return newSongId;
      }
    });

    return transaction();
  }

  /**
   * Insert verses for a song
   */
  private insertVerses(songId: number, verses: Verse[]): void {
    const insertStmt = this.db.prepare(`
      INSERT INTO verses (
        song_id,
        verse_order,
        verse_type,
        verse_text
      ) VALUES (?, ?, ?, ?)
    `);

    for (const verse of verses) {
      // Determine verse type from label or default to 'v' + order
      let verseType = 'v';
      if (verse.label) {
        const labelLower = verse.label.toLowerCase();
        if (labelLower.includes('chorus') || labelLower.includes('c')) {
          verseType = 'c';
        } else if (labelLower.includes('bridge') || labelLower.includes('b')) {
          verseType = 'b';
        } else {
          verseType = `v${verse.order}`;
        }
      } else {
        verseType = `v${verse.order}`;
      }

      insertStmt.run(songId, verse.order, verseType, verse.content);
    }
  }

  /**
   * Format song lyrics for OpenLP format
   * OpenLP stores all verses in a single lyrics field with special formatting
   */
  private formatSongLyrics(song: SongResponseDto): string {
    const parts: string[] = [];

    // Add chorus if present
    if (song.chorus) {
      parts.push(`[C]\n${song.chorus}\n`);
    }

    // Add verses
    for (const verse of song.verses) {
      const label = verse.label || `Verse ${verse.order}`;
      parts.push(`[${label}]\n${verse.content}\n`);
    }

    return parts.join('\n');
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

