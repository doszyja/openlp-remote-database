import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { ApiClientService } from './api-client.service';
import type { SongResponseDto, PaginatedResponseDto, SongQueryDto } from '@openlp/shared';

// Mock axios
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
  defaults: {},
  interceptors: {},
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

describe('ApiClientService', () => {
  let apiClient: ApiClientService;
  let mockAxiosInstance: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    request: ReturnType<typeof vi.fn>;
    defaults: any;
    interceptors: any;
  };

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      request: vi.fn(),
      defaults: {},
      interceptors: {},
    };

    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
    apiClient = new ApiClientService('http://localhost:3000');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with base URL', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    });

    it('should include Authorization header when API key is provided', () => {
      new ApiClientService('http://localhost:3000', 'test-api-key');
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });
  });

  describe('getAllSongs', () => {
    it('should fetch songs with pagination', async () => {
      const mockResponse: PaginatedResponseDto<SongResponseDto> = {
        data: [
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
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getAllSongs({ page: 1, limit: 20 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/songs?page=1&limit=20');
      expect(result).toEqual(mockResponse);
    });

    it('should include query parameters correctly', async () => {
      const mockResponse: PaginatedResponseDto<SongResponseDto> = {
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const query: SongQueryDto = {
        page: 2,
        limit: 50,
        language: 'en',
        tags: ['worship', 'praise'],
        search: 'grace',
        sortBy: 'title',
        sortOrder: 'asc',
      };

      await apiClient.getAllSongs(query);

      const callUrl = mockAxiosInstance.get.mock.calls[0][0];
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=50');
      expect(callUrl).toContain('language=en');
      expect(callUrl).toContain('tags=worship');
      expect(callUrl).toContain('tags=praise');
      expect(callUrl).toContain('search=grace');
      expect(callUrl).toContain('sortBy=title');
      expect(callUrl).toContain('sortOrder=asc');
    });

    it('should handle empty query', async () => {
      const mockResponse: PaginatedResponseDto<SongResponseDto> = {
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      await apiClient.getAllSongs();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/songs');
    });
  });

  describe('getSongById', () => {
    it('should fetch a single song by ID', async () => {
      const mockSong: SongResponseDto = {
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
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockSong });

      const result = await apiClient.getSongById('song1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/songs/song1');
      expect(result).toEqual(mockSong);
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Song not found'));

      await expect(apiClient.getSongById('invalid-id')).rejects.toThrow('Song not found');
    });
  });

  describe('fetchAllSongs', () => {
    it('should fetch all songs across multiple pages', async () => {
      const page1Response: PaginatedResponseDto<SongResponseDto> = {
        data: Array.from({ length: 100 }, (_, i) => ({
          id: `song${i + 1}`,
          title: `Song ${i + 1}`,
          number: null,
          language: 'en',
          chorus: null,
          verses: 'Verse 1',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })),
        meta: {
          page: 1,
          limit: 100,
          total: 150,
          totalPages: 2,
        },
      };

      const page2Response: PaginatedResponseDto<SongResponseDto> = {
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `song${i + 101}`,
          title: `Song ${i + 101}`,
          number: null,
          language: 'en',
          chorus: null,
          verses: 'Verse 1',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })),
        meta: {
          page: 2,
          limit: 100,
          total: 150,
          totalPages: 2,
        },
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: page1Response })
        .mockResolvedValueOnce({ data: page2Response });

      const result = await apiClient.fetchAllSongs();

      expect(result).toHaveLength(150);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(1, '/songs?page=1&limit=100');
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(2, '/songs?page=2&limit=100');
    });

    it('should handle single page of results', async () => {
      const mockResponse: PaginatedResponseDto<SongResponseDto> = {
        data: [
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
        ],
        meta: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.fetchAllSongs();

      expect(result).toHaveLength(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should stop when page has fewer items than limit', async () => {
      const mockResponse: PaginatedResponseDto<SongResponseDto> = {
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `song${i + 1}`,
          title: `Song ${i + 1}`,
          number: null,
          language: 'en',
          chorus: null,
          verses: 'Verse 1',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })),
        meta: {
          page: 1,
          limit: 100,
          total: 50,
          totalPages: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.fetchAllSongs();

      expect(result).toHaveLength(50);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should handle empty results', async () => {
      const mockResponse: PaginatedResponseDto<SongResponseDto> = {
        data: [],
        meta: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0,
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.fetchAllSongs();

      expect(result).toHaveLength(0);
    });

    it('should preserve verses string format', async () => {
      const mockResponse: PaginatedResponseDto<SongResponseDto> = {
        data: [
          {
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
          },
        ],
        meta: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.fetchAllSongs();

      expect(result[0].verses).toBe('Verse 1\n\nVerse 2\n\nVerse 3');
      expect(result[0].searchLyrics).toBe('verse 1\n\nverse 2\n\nverse 3');
    });
  });
});
