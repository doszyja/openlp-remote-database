import type {
  CreateSongDto,
  UpdateSongDto,
  SongQueryDto,
  PaginatedResponseDto,
  SongResponseDto,
  SongListCacheItem,
  AuditLog,
  ServicePlan,
  CreateServicePlanDto,
  UpdateServicePlanDto,
  AddSongToPlanDto,
  SetActiveSongDto,
} from '@openlp/shared';

// In development, use relative paths (via Vite proxy)
// In production, use full API URL
const API_URL = import.meta.env.DEV 
  ? '/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api');
const STORAGE_KEY = 'auth_token';

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
  
  // Log API requests (except version checks to reduce noise)
  const isVersionCheck = endpoint.includes('/songs/version');
  if (!isVersionCheck) {
    console.log(`[API Request] ${options?.method || 'GET'} ${endpoint}`);
  }
  
  const startTime = performance.now();
  
  // Get auth token from localStorage
  const token = localStorage.getItem(STORAGE_KEY);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    headers,
    ...options,
  };

  const response = await fetch(url, config);
  const duration = performance.now() - startTime;

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (!isVersionCheck) {
      console.error(`[API Request] ${options?.method || 'GET'} ${endpoint} failed (${response.status}) in ${duration.toFixed(2)}ms`);
    }
    throw new ApiError(
      errorData.message || `HTTP ${response.status}`,
      response.status,
      errorData
    );
  }

  const data = await response.json();
  if (!isVersionCheck) {
    console.log(`[API Request] ${options?.method || 'GET'} ${endpoint} completed in ${duration.toFixed(2)}ms`);
  }
  
  return data;
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

    exportZip: async (): Promise<Blob> => {
      const url = `${API_URL}/songs/export/zip`;
      const token = localStorage.getItem(STORAGE_KEY);
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }
      
      return response.blob();
    },

    getVersion: (): Promise<{ version: number }> => {
      return request('/songs/version');
    },

    getAllForCache: (): Promise<{ version: number; songs: SongListCacheItem[] }> => {
      return request('/songs/all');
    },
  },
  auditLogs: {
    getAll: (
      page?: number,
      limit?: number,
      filters?: {
        action?: string;
        username?: string;
        songId?: string;
        fromDate?: string;
        toDate?: string;
      }
    ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number; totalPages: number }> => {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (limit) params.append('limit', limit.toString());
      if (filters?.action) params.append('action', filters.action);
      if (filters?.username) params.append('username', filters.username);
      if (filters?.songId) params.append('songId', filters.songId);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);

      const queryString = params.toString();
      return request(`/audit-logs${queryString ? `?${queryString}` : ''}`);
    },
  },
  servicePlans: {
    getAll: (): Promise<ServicePlan[]> => {
      return request('/service-plans');
    },

    getById: (id: string): Promise<ServicePlan> => {
      return request(`/service-plans/${id}`);
    },

    getActive: (): Promise<{ servicePlan: { id: string; name: string }; item: { id: string; songId: string; songTitle: string; order: number }; song: SongResponseDto } | null> => {
      return request('/service-plans/active');
    },

    create: (data: CreateServicePlanDto): Promise<ServicePlan> => {
      return request('/service-plans', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: (id: string, data: UpdateServicePlanDto): Promise<ServicePlan> => {
      return request(`/service-plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: (id: string): Promise<void> => {
      return request(`/service-plans/${id}`, {
        method: 'DELETE',
      });
    },

    addSong: (id: string, data: AddSongToPlanDto): Promise<ServicePlan> => {
      return request(`/service-plans/${id}/songs`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    removeSong: (planId: string, itemId: string): Promise<void> => {
      return request(`/service-plans/${planId}/songs/${itemId}`, {
        method: 'DELETE',
      });
    },

    setActiveSong: (id: string, data: SetActiveSongDto): Promise<ServicePlan> => {
      return request(`/service-plans/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  },
};

export { ApiError };

