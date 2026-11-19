import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SongListCacheItem } from '@openlp/shared';
import { songsCache } from '../services/songs-cache';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Hook to get all songs list from cache with automatic version checking
 * Fetches song list (metadata only) once and stores in memory, then uses cache for subsequent calls
 */
export function useCachedSongs() {
  const cachedOnMount = songsCache.getCachedSongs();

  const {
    data: songs,
    isLoading,
    error,
    refetch,
  } = useQuery<SongListCacheItem[]>({
    queryKey: ['cached-songs'],
    queryFn: () => songsCache.ensureValidCache(),
    ...(cachedOnMount ? { initialData: cachedOnMount } : {}),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
    // Version check lives in ensureValidCache. It calls /songs/all only when the catalog is missing or stale.
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const songList = songs ?? [];

  return {
    songs: songList,
    isLoading: isLoading && songList.length === 0,
    error,
    refetch,
    cacheVersion: songsCache.getCachedVersion(),
  };
}

export const SONG_SEARCH_DEBOUNCE_MS = 300;

/**
 * Hook to search songs using cached data
 */
export function useCachedSongSearch(
  query: string,
  options?: {
    language?: string;
    tags?: string[];
  }
) {
  const { songs, isLoading } = useCachedSongs();
  const debouncedQuery = useDebouncedValue(query, SONG_SEARCH_DEBOUNCE_MS);
  const isDebouncing = query.trim() !== debouncedQuery.trim();

  // Extract options to stable values for dependency array
  const language = options?.language;
  const tagsKey = options?.tags?.join(',');
  const songsCount = songs?.length;

  // Use useMemo to prevent unnecessary recalculations and re-renders
  // Only recalculate when query or songs actually change
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return [];
    }

    // Use cache for search - this is synchronous and fast
    return songsCache.searchInCache(debouncedQuery, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, songsCount, language, tagsKey]);

  return {
    results: searchResults,
    /** True only while the song catalog is loading — not during search debounce. */
    isLoading,
    isDebouncing,
    debouncedQuery,
  };
}
