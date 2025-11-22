import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SongResponseDto } from '@openlp/shared';

export function useSong(id: string) {
  return useQuery<SongResponseDto>({
    queryKey: ['song', id],
    queryFn: () => api.songs.getById(id),
    enabled: !!id,
  });
}

