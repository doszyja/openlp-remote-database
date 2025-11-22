import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SongQueryDto, PaginatedResponseDto, SongResponseDto } from '@openlp/shared';

export function useSongs(query?: SongQueryDto) {
  return useQuery<PaginatedResponseDto<SongResponseDto>>({
    queryKey: ['songs', query],
    queryFn: () => api.songs.getAll(query),
  });
}

