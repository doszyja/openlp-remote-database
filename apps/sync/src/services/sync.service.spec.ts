import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncService, SyncResult } from './sync.service';
import { ApiClientService } from './api-client.service';
import { OpenLPDatabaseService } from './openlp-db.service';
import type { SongResponseDto } from '@openlp/shared';

describe('SyncService', () => {
  let syncService: SyncService;
  let mockApiClient: {
    fetchAllSongs: ReturnType<typeof vi.fn>;
    getSongById: ReturnType<typeof vi.fn>;
    getAllSongs: ReturnType<typeof vi.fn>;
  };
  let mockOpenlpDb: {
    upsertSong: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mocks
    mockApiClient = {
      fetchAllSongs: vi.fn(),
      getSongById: vi.fn(),
      getAllSongs: vi.fn(),
    };

    mockOpenlpDb = {
      upsertSong: vi.fn(),
      close: vi.fn(),
    };

    syncService = new SyncService(mockApiClient as any, mockOpenlpDb as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('syncAll', () => {
    it('should sync all songs successfully', async () => {
      const mockSongs: SongResponseDto[] = [
        {
          id: 'song1',
          title: 'Amazing Grace',
          number: '123',
          language: 'en',
          chorus: 'Amazing grace',
          verses: 'Verse 1\n\nVerse 2',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          searchTitle: 'amazing grace',
          searchLyrics: 'verse 1\n\nverse 2',
        },
        {
          id: 'song2',
          title: 'How Great Thou Art',
          number: '456',
          language: 'en',
          chorus: null,
          verses: 'Verse 1',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      mockApiClient.fetchAllSongs.mockResolvedValue(mockSongs);
      mockOpenlpDb.upsertSong.mockReturnValueOnce(1).mockReturnValueOnce(2);

      const result = await syncService.syncAll({ verbose: false });

      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockApiClient.fetchAllSongs).toHaveBeenCalledTimes(1);
      expect(mockOpenlpDb.upsertSong).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully and continue syncing', async () => {
      const mockSongs: SongResponseDto[] = [
        {
          id: 'song1',
          title: 'Song 1',
          number: null,
          language: 'en',
          chorus: null,
          verses: 'Verse 1',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'song2',
          title: 'Song 2',
          number: null,
          language: 'en',
          chorus: null,
          verses: 'Verse 2',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      mockApiClient.fetchAllSongs.mockResolvedValue(mockSongs);
      mockOpenlpDb.upsertSong
        .mockReturnValueOnce(1)
        .mockImplementationOnce(() => {
          throw new Error('Database error');
        });

      const result = await syncService.syncAll({ verbose: false });

      expect(result.total).toBe(2);
      expect(result.created).toBe(1);
      expect(result.errors).toBe(1);
      expect(mockOpenlpDb.upsertSong).toHaveBeenCalledTimes(2);
    });

    it('should handle empty song list', async () => {
      mockApiClient.fetchAllSongs.mockResolvedValue([]);

      const result = await syncService.syncAll({ verbose: false });

      expect(result.total).toBe(0);
      expect(result.created).toBe(0);
      expect(result.errors).toBe(0);
      expect(mockOpenlpDb.upsertSong).not.toHaveBeenCalled();
    });

    it('should skip syncing in dry run mode', async () => {
      const mockSongs: SongResponseDto[] = [
        {
          id: 'song1',
          title: 'Test Song',
          number: null,
          language: 'en',
          chorus: null,
          verses: 'Verse 1',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      mockApiClient.fetchAllSongs.mockResolvedValue(mockSongs);

      const result = await syncService.syncAll({ dryRun: true, verbose: false });

      expect(result.total).toBe(1);
      expect(result.created).toBe(1); // Still counts as created in dry run
      expect(mockOpenlpDb.upsertSong).not.toHaveBeenCalled();
    });

    it('should handle API fetch errors', async () => {
      mockApiClient.fetchAllSongs.mockRejectedValue(new Error('API error'));

      await expect(syncService.syncAll({ verbose: false })).rejects.toThrow('API error');
    });

    it('should pass verses string correctly to upsertSong', async () => {
      const mockSong: SongResponseDto = {
        id: 'song1',
        title: 'Test Song',
        number: null,
        language: 'en',
        chorus: 'Chorus text',
        verses: 'Verse 1\n\nVerse 2\n\nVerse 3',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        searchTitle: 'test song',
        searchLyrics: 'verse 1\n\nverse 2\n\nverse 3',
      };

      mockApiClient.fetchAllSongs.mockResolvedValue([mockSong]);
      mockOpenlpDb.upsertSong.mockReturnValue(1);

      await syncService.syncAll({ verbose: false });

      expect(mockOpenlpDb.upsertSong).toHaveBeenCalledWith(
        expect.objectContaining({
          verses: 'Verse 1\n\nVerse 2\n\nVerse 3',
          searchTitle: 'test song',
          searchLyrics: 'verse 1\n\nverse 2\n\nverse 3',
        }),
        undefined,
      );
    });
  });

  describe('syncSongById', () => {
    it('should sync a single song by ID', async () => {
      const mockSong: SongResponseDto = {
        id: 'song1',
        title: 'Test Song',
        number: null,
        language: 'en',
        chorus: null,
        verses: 'Verse 1',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockApiClient.getSongById.mockResolvedValue(mockSong);
      mockOpenlpDb.upsertSong.mockReturnValue(1);

      await syncService.syncSongById('song1', { verbose: false });

      expect(mockApiClient.getSongById).toHaveBeenCalledWith('song1');
      expect(mockOpenlpDb.upsertSong).toHaveBeenCalledWith(mockSong, undefined);
    });

    it('should handle errors when syncing by ID', async () => {
      mockApiClient.getSongById.mockRejectedValue(new Error('Song not found'));

      await expect(syncService.syncSongById('invalid-id', { verbose: false })).rejects.toThrow(
        'Song not found',
      );
    });

    it('should skip syncing in dry run mode', async () => {
      const mockSong: SongResponseDto = {
        id: 'song1',
        title: 'Test Song',
        number: null,
        language: 'en',
        chorus: null,
        verses: 'Verse 1',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockApiClient.getSongById.mockResolvedValue(mockSong);

      await syncService.syncSongById('song1', { dryRun: true, verbose: false });

      expect(mockApiClient.getSongById).toHaveBeenCalledWith('song1');
      expect(mockOpenlpDb.upsertSong).not.toHaveBeenCalled();
    });
  });
});

