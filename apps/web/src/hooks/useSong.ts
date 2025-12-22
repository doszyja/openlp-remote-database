import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SongResponseDto } from '@openlp/shared';

export function useSong(id: string, options?: { forceRefresh?: boolean }) {
  return useQuery<SongResponseDto>({
    queryKey: ['song', id],
    queryFn: () => api.songs.getById(id),
    enabled: !!id,
    staleTime: options?.forceRefresh ? 0 : 5 * 60 * 1000, // No cache if forceRefresh, otherwise cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: options?.forceRefresh ? true : undefined, // Always refetch on mount if forceRefresh
  });
}

