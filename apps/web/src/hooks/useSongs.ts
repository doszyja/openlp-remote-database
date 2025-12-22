import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SongQueryDto, PaginatedResponseDto, SongResponseDto } from '@openlp/shared';

export function useSongs(query?: SongQueryDto) {
  // Create a stable query key by serializing the query object
  const queryKey = [
    'songs',
    query?.page || 1,
    query?.limit || 200,
    query?.search || '',
    query?.language || '',
    query?.sortBy || '',
    query?.sortOrder || '',
  ];

  // Check if this is a default query (no search, no filters, no custom sorting)
  // Default query = only page and limit (or no query at all)
  const isDefaultQuery =
    !query?.search &&
    !query?.language &&
    !query?.sortBy &&
    !query?.tags?.length &&
    (!query || (query.page === 1 && query.limit === 200));

  return useQuery<PaginatedResponseDto<SongResponseDto>>({
    queryKey,
    queryFn: () => api.songs.getAll(query),
    // 2 minute cache for default queries (list without search/filters)
    // For search/filtered queries, use default staleTime from main.tsx (5 minutes)
    staleTime: isDefaultQuery ? 2 * 60 * 1000 : undefined,
    gcTime: isDefaultQuery ? 5 * 60 * 1000 : undefined,
  });
}
