import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { songsCache } from '../services/songs-cache';
import type { UpdateSongDto, SongResponseDto } from '@openlp/shared';

export function useUpdateSong() {
  const queryClient = useQueryClient();

  return useMutation<SongResponseDto, Error, { id: string; data: UpdateSongDto }>({
    mutationFn: ({ id, data }) => api.songs.update(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['song', data.id] });
      // Invalidate export cache when song is updated
      queryClient.invalidateQueries({ queryKey: ['songs', 'export', 'zip'] });
      // Force refresh songs cache (song content changed)
      const refreshedSongs = await songsCache.forceRefresh()
        .then(() => songsCache.getCachedSongs())
        .catch(err => {
          console.error('[useUpdateSong] Failed to refresh cache:', err);
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

