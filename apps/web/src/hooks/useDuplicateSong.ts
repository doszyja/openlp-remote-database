import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { songsCache } from '../services/songs-cache';
import type { CreateSongDto, SongResponseDto } from '@openlp/shared';

export function useDuplicateSong() {
  const queryClient = useQueryClient();

  return useMutation<SongResponseDto, Error, string>({
    mutationFn: async (songId: string) => {
      try {
        // Fetch the song to duplicate
        const song = await api.songs.getById(songId);

        console.log('[useDuplicateSong] Song data:', {
          id: song.id,
          title: song.title,
          versesType: typeof song.verses,
          versesIsArray: Array.isArray(song.verses),
          versesValue: song.verses,
          versesArrayType: typeof song.versesArray,
          versesArrayIsArray: Array.isArray(song.versesArray),
          versesArrayLength: song.versesArray?.length,
        });

        // Use versesArray if available (preferred), otherwise try to convert verses string to array
        let verses: Array<{
          order: number;
          content: string;
          label?: string;
          originalLabel?: string;
        }> = [];

        if (song.versesArray && Array.isArray(song.versesArray) && song.versesArray.length > 0) {
          console.log('[useDuplicateSong] Using versesArray');
          // Use versesArray directly (has originalLabel, no duplicates)
          verses = song.versesArray.map(v => ({
            order: v.order,
            content: v.content,
            label: v.label,
            originalLabel: v.originalLabel,
          }));
        } else if (Array.isArray(song.verses) && song.verses.length > 0) {
          console.log('[useDuplicateSong] Using verses as array');
          // Fallback: if verses is an array (shouldn't happen but handle it)
          verses = song.verses.map(v => ({
            order: v.order,
            content: v.content,
            label: v.label,
            originalLabel: v.originalLabel,
          }));
        } else if (typeof song.verses === 'string' && (song.verses as unknown as string)?.trim()) {
          console.log('[useDuplicateSong] Parsing verses string');
          // Last resort: parse verses string (may lose originalLabel)
          // Split by double newline and create verses with order
          const versesStr = song.verses as unknown as string;
          const verseStrings = versesStr.split(/\n\n+/);
          verses = verseStrings.map((content: string, index: number) => ({
            order: index + 1,
            content: content.trim(),
            label: undefined,
            originalLabel: undefined,
          }));
        } else {
          console.warn('[useDuplicateSong] No verses found in song:', {
            verses: song.verses,
            versesArray: song.versesArray,
          });
        }

        console.log('[useDuplicateSong] Processed verses:', verses.length, verses);

        if (verses.length === 0) {
          throw new Error('Nie można skopiować pieśni bez wersów');
        }

        // Create a copy with modified title
        const duplicateData: CreateSongDto = {
          title: `${song.title} (kopia)`,
          number: song.number || null,
          language: song.language || 'en',
          verses: verses,
          verseOrder: song.verseOrder || null,
          lyricsXml: song.lyricsXml || null,
          tags: song.tags?.map(tag => (typeof tag === 'string' ? tag : tag.name)) || [],
          copyright: song.copyright || undefined,
          comments: song.comments || undefined,
          ccliNumber: song.ccliNumber || undefined,
        };

        console.log('[useDuplicateSong] Creating duplicate:', duplicateData);
        return await api.songs.create(duplicateData);
      } catch (error) {
        console.error('[useDuplicateSong] Error duplicating song:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      // Invalidate export cache when song is duplicated
      queryClient.invalidateQueries({ queryKey: ['songs', 'export', 'zip'] });
      // Force refresh songs cache (version will be bumped on backend)
      const refreshedSongs = await songsCache
        .forceRefresh()
        .then(() => songsCache.getCachedSongs())
        .catch(err => {
          console.error('[useDuplicateSong] Failed to refresh cache:', err);
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
