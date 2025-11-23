import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { CreateSongDto, SongResponseDto } from '@openlp/shared';

export function useCreateSong() {
  const queryClient = useQueryClient();

  return useMutation<SongResponseDto, Error, CreateSongDto>({
    mutationFn: (data) => api.songs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      // Invalidate export cache when song is created
      queryClient.invalidateQueries({ queryKey: ['songs', 'export', 'zip'] });
    },
  });
}

