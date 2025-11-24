import axios, { AxiosInstance } from 'axios';
import type { SongResponseDto, PaginatedResponseDto, SongQueryDto } from '@openlp/shared';

export class ApiClientService {
  private client: AxiosInstance;

  constructor(baseURL: string, apiKey?: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Get all songs from the backend API
   */
  async getAllSongs(query?: SongQueryDto): Promise<PaginatedResponseDto<SongResponseDto>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.language) params.append('language', query.language);
    if (query?.tags) query.tags.forEach((tag) => params.append('tags', tag));
    if (query?.search) params.append('search', query.search);
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    const response = await this.client.get<PaginatedResponseDto<SongResponseDto>>(
      `/songs${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data;
  }

  /**
   * Get a single song by ID
   */
  async getSongById(id: string): Promise<SongResponseDto> {
    const response = await this.client.get<SongResponseDto>(`/songs/${id}`);
    return response.data;
  }

  /**
   * Fetch all songs with pagination
   */
  async fetchAllSongs(): Promise<SongResponseDto[]> {
    const allSongs: SongResponseDto[] = [];
    let page = 1;
    const limit = 100; // Fetch in batches

    while (true) {
      const response = await this.getAllSongs({ page, limit });
      allSongs.push(...response.data);

      if (response.data.length < limit || page >= response.meta.totalPages) {
        break;
      }

      page++;
    }

    return allSongs;
  }
}

