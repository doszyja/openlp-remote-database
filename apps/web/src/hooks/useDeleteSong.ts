import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useDeleteSong() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => api.songs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    },
  });
}

