import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SongQueryDto, PaginatedResponseDto, SongResponseDto } from '@openlp/shared';

export function useSongs(query?: SongQueryDto) {
  // Create a stable query key by serializing the query object
  const queryKey = ['songs', query?.page || 1, query?.limit || 200, query?.search || '', query?.language || '', query?.sortBy || '', query?.sortOrder || ''];
  
  return useQuery<PaginatedResponseDto<SongResponseDto>>({
    queryKey,
    queryFn: () => api.songs.getAll(query),
    staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes - cache for 5 minutes
  });
}

