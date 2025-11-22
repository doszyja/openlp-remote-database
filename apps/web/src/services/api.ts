import type {
  CreateSongDto,
  UpdateSongDto,
  SongQueryDto,
  PaginatedResponseDto,
  SongResponseDto,
} from '@openlp/shared';

const API_URL = (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `HTTP ${response.status}`,
      response.status,
      errorData
    );
  }

  return response.json();
}

export const api = {
  songs: {
    getAll: (query?: SongQueryDto): Promise<PaginatedResponseDto<SongResponseDto>> => {
      const params = new URLSearchParams();
      if (query?.page) params.append('page', query.page.toString());
      if (query?.limit) params.append('limit', query.limit.toString());
      if (query?.language) params.append('language', query.language);
      if (query?.tags) query.tags.forEach((tag) => params.append('tags', tag));
      if (query?.search) params.append('search', query.search);
      if (query?.sortBy) params.append('sortBy', query.sortBy);
      if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

      const queryString = params.toString();
      return request(`/songs${queryString ? `?${queryString}` : ''}`);
    },

    getById: (id: string): Promise<SongResponseDto> => {
      return request(`/songs/${id}`);
    },

    create: (data: CreateSongDto): Promise<SongResponseDto> => {
      return request('/songs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: (id: string, data: UpdateSongDto): Promise<SongResponseDto> => {
      return request(`/songs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: (id: string): Promise<void> => {
      return request(`/songs/${id}`, {
        method: 'DELETE',
      });
    },

    search: (query: string, options?: SongQueryDto): Promise<PaginatedResponseDto<SongResponseDto>> => {
      const params = new URLSearchParams();
      params.append('q', query);
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());

      return request(`/songs/search?${params.toString()}`);
    },
  },
};

export { ApiError };

