import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { UpdateSongDto, SongResponseDto } from '@openlp/shared';

export function useUpdateSong() {
  const queryClient = useQueryClient();

  return useMutation<SongResponseDto, Error, { id: string; data: UpdateSongDto }>({
    mutationFn: ({ id, data }) => api.songs.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['song', data.id] });
    },
  });
}

