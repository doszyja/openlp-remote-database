import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { OpenLPDatabaseService } from './openlp-db.service';
import type { SongResponseDto } from '@openlp/shared';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync } from 'fs';

describe('OpenLPDatabaseService', () => {
  let service: OpenLPDatabaseService;
  let db: Database.Database;
  let dbPath: string;

  beforeEach(() => {
    // Create temporary file database for testing (shared between test and service)
    dbPath = join(tmpdir(), `test-${Date.now()}-${Math.random().toString(36).substring(7)}.db`);
    db = new Database(dbPath);

    // Create tables matching OpenLP schema
    db.exec(`
      CREATE TABLE songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        alternate_title TEXT,
        lyrics TEXT,
        search_title TEXT,
        search_lyrics TEXT,
        copyright TEXT,
        comments TEXT,
        ccli_number TEXT,
        theme_name TEXT,
        last_modified TEXT
      );
    `);

    // Service will create its own connection to the same file
    service = new OpenLPDatabaseService(dbPath);
  });

  afterEach(() => {
    service.close();
    db.close();
    // Clean up temporary database file
    try {
      unlinkSync(dbPath);
    } catch (error) {
      // Ignore errors if file doesn't exist
    }
  });

  describe('upsertSong', () => {
    it('should set search_title and search_lyrics when creating a song', () => {
      const song: SongResponseDto = {
        id: 'test-id',
        title: 'Amazing Grace',
        number: '123',
        language: 'en',
        chorus: 'Amazing grace, how sweet the sound',
        verses: 'Verse 1 content\n\nVerse 2 content',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        searchTitle: 'amazing grace',
        searchLyrics: 'verse 1 content\n\nverse 2 content',
      };

      const openlpId = service.upsertSong(song);

      const result = db.prepare('SELECT * FROM songs WHERE id = ?').get(openlpId) as Record<
        string,
        unknown
      >;

      expect(result.title).toBe('Amazing Grace');
      expect(result.search_title).toBe('amazing grace');
      expect(result.search_lyrics).toBe('verse 1 content\n\nverse 2 content');
    });

    it('should auto-generate search_title if not provided', () => {
      const song: SongResponseDto = {
        id: 'test-id',
        title: 'Test Song',
        number: null,
        language: 'en',
        chorus: null,
        verses: 'Some verses',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const openlpId = service.upsertSong(song);

      const result = db.prepare('SELECT * FROM songs WHERE id = ?').get(openlpId) as Record<
        string,
        unknown
      >;

      expect(result.search_title).toBe('test song');
    });

    it('should auto-generate search_lyrics from verses if not provided', () => {
      const song: SongResponseDto = {
        id: 'test-id',
        title: 'Test Song',
        number: null,
        language: 'en',
        chorus: null,
        verses: 'Verse One\n\nVerse Two',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const openlpId = service.upsertSong(song);

      const result = db.prepare('SELECT * FROM songs WHERE id = ?').get(openlpId) as Record<
        string,
        unknown
      >;

      expect(result.search_lyrics).toBe('verse one\n\nverse two');
    });

    it('should update search_title and search_lyrics when updating a song', () => {
      // First create a song
      const song: SongResponseDto = {
        id: 'test-id',
        title: 'Original Title',
        number: null,
        language: 'en',
        chorus: null,
        verses: 'Original verses',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        searchTitle: 'original title',
        searchLyrics: 'original verses',
      };

      const openlpId = service.upsertSong(song);

      // Update the song
      const updatedSong: SongResponseDto = {
        ...song,
        title: 'Updated Title',
        verses: 'Updated verses',
        searchTitle: 'updated title',
        searchLyrics: 'updated verses',
      };

      service.upsertSong(updatedSong, openlpId);

      const result = db.prepare('SELECT * FROM songs WHERE id = ?').get(openlpId) as Record<
        string,
        unknown
      >;

      expect(result.title).toBe('Updated Title');
      expect(result.search_title).toBe('updated title');
      expect(result.search_lyrics).toBe('updated verses');
    });

    it('should format verses string to OpenLP XML format', () => {
      const song: SongResponseDto = {
        id: 'test-id',
        title: 'Test Song',
        number: null,
        language: 'en',
        chorus: 'Chorus text',
        verses: 'Verse 1\n\nVerse 2',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const openlpId = service.upsertSong(song);

      const result = db.prepare('SELECT lyrics FROM songs WHERE id = ?').get(openlpId) as Record<
        string,
        unknown
      >;

      // Should contain XML verse tags
      expect(result.lyrics).toContain('<verse label="c">');
      expect(result.lyrics).toContain('Chorus text');
      expect(result.lyrics).toContain('<verse label="v1">');
      expect(result.lyrics).toContain('Verse 1');
      expect(result.lyrics).toContain('<verse label="v2">');
      expect(result.lyrics).toContain('Verse 2');
    });

    it('should preserve verse order when formatting to XML', () => {
      const song: SongResponseDto = {
        id: 'test-id',
        title: 'Ordered Song',
        number: null,
        language: 'en',
        chorus: null,
        verses: 'First\n\nSecond\n\nThird',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const openlpId = service.upsertSong(song);

      const result = db.prepare('SELECT lyrics FROM songs WHERE id = ?').get(openlpId) as Record<
        string,
        unknown
      >;

      // Verify order: v1 should come before v2, v2 before v3
      const v1Index = result.lyrics.indexOf('<verse label="v1">');
      const v2Index = result.lyrics.indexOf('<verse label="v2">');
      const v3Index = result.lyrics.indexOf('<verse label="v3">');

      expect(v1Index).toBeLessThan(v2Index);
      expect(v2Index).toBeLessThan(v3Index);
    });
  });

  describe('formatSongLyrics', () => {
    it('should handle empty verses string', () => {
      const song: SongResponseDto = {
        id: 'test-id',
        title: 'Empty Song',
        number: null,
        language: 'en',
        chorus: null,
        verses: '',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const openlpId = service.upsertSong(song);

      const result = db.prepare('SELECT lyrics FROM songs WHERE id = ?').get(openlpId) as Record<
        string,
        unknown
      >;

      // Should still create XML structure even with empty verses
      expect(result.lyrics).toBeDefined();
    });

    it('should split verses by double newlines', () => {
      const song: SongResponseDto = {
        id: 'test-id',
        title: 'Multi Verse Song',
        number: null,
        language: 'en',
        chorus: null,
        verses: 'Verse One\n\nVerse Two\n\nVerse Three',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const openlpId = service.upsertSong(song);

      const result = db.prepare('SELECT lyrics FROM songs WHERE id = ?').get(openlpId) as Record<
        string,
        unknown
      >;

      // Should have 3 verse tags
      const verseMatches = result.lyrics.match(/<verse label="v\d+">/g);
      expect(verseMatches).toHaveLength(3);
    });

    it('should handle single verse without double newlines', () => {
      const song: SongResponseDto = {
        id: 'test-id',
        title: 'Single Verse',
        number: null,
        language: 'en',
        chorus: null,
        verses: 'Single verse content',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const openlpId = service.upsertSong(song);

      const result = db.prepare('SELECT lyrics FROM songs WHERE id = ?').get(openlpId) as Record<
        string,
        unknown
      >;

      // Should have 1 verse tag
      expect(result.lyrics).toContain('<verse label="v1">');
      expect(result.lyrics).toContain('Single verse content');
    });
  });
});
