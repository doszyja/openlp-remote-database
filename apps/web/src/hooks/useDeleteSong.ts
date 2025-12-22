import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { songsCache } from '../services/songs-cache';

export function useDeleteSong() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: id => api.songs.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      // Invalidate export cache when song is deleted
      queryClient.invalidateQueries({ queryKey: ['songs', 'export', 'zip'] });
      // Force refresh songs cache (version will be bumped on backend)
      const refreshedSongs = await songsCache
        .forceRefresh()
        .then(() => songsCache.getCachedSongs())
        .catch(err => {
          console.error('[useDeleteSong] Failed to refresh cache:', err);
          return null;
        });

      // Update React Query cache with fresh data
      if (refreshedSongs) {
        queryClient.setQueryData(['cached-songs'], refreshedSongs);
      } else {
        // Fallback: invalidate to trigger re-fetch
        queryClient.invalidateQueries({ queryKey: ['cached-songs'] });
      }
    },
  });
}
