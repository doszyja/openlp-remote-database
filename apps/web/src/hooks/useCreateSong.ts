import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { songsCache } from '../services/songs-cache';
import type { CreateSongDto, SongResponseDto } from '@openlp/shared';

export function useCreateSong() {
  const queryClient = useQueryClient();

  return useMutation<SongResponseDto, Error, CreateSongDto>({
    mutationFn: data => api.songs.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      // Invalidate export cache when song is created
      queryClient.invalidateQueries({ queryKey: ['songs', 'export', 'zip'] });
      // Force refresh songs cache (version will be bumped on backend)
      const refreshedSongs = await songsCache
        .forceRefresh()
        .then(() => songsCache.getCachedSongs())
        .catch(err => {
          console.error('[useCreateSong] Failed to refresh cache:', err);
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
