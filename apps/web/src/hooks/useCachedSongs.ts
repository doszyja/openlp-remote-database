import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SongListCacheItem } from '@openlp/shared';
import { songsCache } from '../services/songs-cache';

/**
 * Hook to get all songs list from cache with automatic version checking
 * Fetches song list (metadata only) once and stores in memory, then uses cache for subsequent calls
 */
export function useCachedSongs() {
  const queryClient = useQueryClient();

  // Get initial data from cache (synchronous, no requests)
  const initialDataRef = useRef<SongListCacheItem[] | undefined>(
    songsCache.getCachedSongs() ?? undefined,
  );


  const { data: songs, isLoading, error, refetch } = useQuery<SongListCacheItem[]>({
    queryKey: ['cached-songs'],
    queryFn: async () => {
      // Only called if we don't have initial data
      console.log('[useCachedSongs] QueryFn called - fetching cache...');
      const cachedSongs = await songsCache.ensureValidCache();
      // Update React Query cache with fresh data
      queryClient.setQueryData(['cached-songs'], cachedSongs);
      return cachedSongs;
    },
    initialData: initialDataRef.current, // Provide cached data immediately, prevents queryFn from running
    staleTime: Infinity, // Cache never goes stale (we use version checking instead)
    gcTime: Infinity, // Keep in memory indefinitely
    retry: 2,
    // Only refetch if we don't have initial data
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Track if this is the first page load (to force version check)
  const isFirstLoadRef = useRef(true);
  
  // Check version on mount - ALWAYS check on first page load to fetch new songs
  // Use a ref to track if we've already initiated a check to prevent multiple simultaneous checks
  const versionCheckInitiatedRef = useRef(false);
  
  useEffect(() => {
    // Skip if version check was already initiated by another component
    if (versionCheckInitiatedRef.current) {
      return;
    }

    const validateVersion = async () => {
      try {
        // Mark as initiated to prevent other components from checking
        versionCheckInitiatedRef.current = true;
        
        // Ensure cache is loaded from localStorage if not in memory
        songsCache.getCachedSongs();
        const cachedVersion = songsCache.getCachedVersion();
        
        // On first page load, ALWAYS check version (forceCheck = true)
        // This ensures we fetch new songs immediately when page loads
        const isFirstLoad = isFirstLoadRef.current;
        isFirstLoadRef.current = false; // Mark as no longer first load
        
        if (cachedVersion !== null) {
          // We have cache - check version (force check on first load, otherwise use 2-minute throttle)
          const isValid = await songsCache.isCacheValid(isFirstLoad);
          if (!isValid) {
            console.log('[useCachedSongs] Version mismatch, refreshing cache...');
            // Version is invalid, refresh cache directly (will call /songs/all)
            await songsCache.refreshCache();
            const updatedSongs = songsCache.getCachedSongs() || [];
            queryClient.setQueryData(['cached-songs'], updatedSongs);
          } else if (isFirstLoad) {
            console.log('[useCachedSongs] First load: version check passed, cache is valid');
          }
        } else {
          // No cache, fetch everything (will call /songs/all which includes version)
          console.log('[useCachedSongs] No cache, fetching all songs...');
          const songs = await songsCache.ensureValidCache();
          queryClient.setQueryData(['cached-songs'], songs);
        }
      } catch (err) {
        console.error('[useCachedSongs] Failed to validate cache on mount:', err);
      } finally {
        // Reset after a delay to allow other components to check if needed
        setTimeout(() => {
          versionCheckInitiatedRef.current = false;
        }, 1000);
      }
    };
    
    // Execute immediately - on first load this will force version check
    validateVersion();
  }, [queryClient]);

  return {
    songs: songs || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to search songs using cached data
 */
export function useCachedSongSearch(query: string, options?: {
  language?: string;
  tags?: string[];
}) {
  const { songs, isLoading } = useCachedSongs();
  
  // Use useMemo to prevent unnecessary recalculations and re-renders
  // Only recalculate when query or songs actually change
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    // Use cache for search - this is synchronous and fast
    return songsCache.searchInCache(query, options);
  }, [query, songs?.length, options?.language, options?.tags?.join(',')]);

  return {
    results: searchResults,
    isLoading,
  };
}

