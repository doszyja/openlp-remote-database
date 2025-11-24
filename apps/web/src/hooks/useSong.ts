import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SongResponseDto } from '@openlp/shared';

export function useSong(id: string) {
  return useQuery<SongResponseDto>({
    queryKey: ['song', id],
    queryFn: () => api.songs.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

