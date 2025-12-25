import type { SongListCacheItem } from '@openlp/shared';
import { api } from './api';

const CACHE_KEY = 'songs_cache';
const VERSION_KEY = 'songs_cache_version';
const VERSION_CHECK_TIMESTAMP_KEY = 'songs_cache_version_check_timestamp';
const VERSION_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds

interface SongsCache {
  version: number;
  songs: SongListCacheItem[];
  timestamp: number;
}

/**
 * Songs cache service for storing all songs in browser memory
 * Uses version checking to determine if cache needs to be refreshed
 */
class SongsCacheService {
  private cache: SongsCache | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;
  private lastVersionCheckTimestamp: number | null = null;
  private pendingVersionCheck: Promise<boolean> | null = null; // Global promise for all components

  /**
   * Get cached songs from memory
   */
  getCachedSongs(): SongListCacheItem[] | null {
    if (!this.cache) {
      // Try to load from localStorage as fallback
      const stored = localStorage.getItem(CACHE_KEY);
      const storedVersion = localStorage.getItem(VERSION_KEY);
      if (stored && storedVersion) {
        try {
          this.cache = {
            version: parseInt(storedVersion, 10),
            songs: JSON.parse(stored),
            timestamp: Date.now(),
          };
          console.log(
            '[Songs Cache] Loaded from localStorage:',
            this.cache.songs.length,
            'songs, version',
            this.cache.version
          );
        } catch (e) {
          console.error('[Songs Cache] Failed to parse cached songs:', e);
          this.clearCache();
        }
      }
    }
    return this.cache?.songs || null;
  }

  /**
   * Get current cached version
   */
  getCachedVersion(): number | null {
    // If cache is in memory, return its version (including 0)
    if (this.cache !== null) {
      return this.cache.version ?? null;
    }

    // Try to get version from localStorage
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== null) {
      const version = parseInt(storedVersion, 10);
      if (!isNaN(version)) {
        return version; // Return 0 if version is 0, don't treat it as falsy
      }
    }

    return null;
  }

  /**
   * Get last version check timestamp
   */
  private getLastVersionCheckTimestamp(): number | null {
    if (this.lastVersionCheckTimestamp !== null) {
      return this.lastVersionCheckTimestamp;
    }

    // Try to get from localStorage
    const stored = localStorage.getItem(VERSION_CHECK_TIMESTAMP_KEY);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      if (!isNaN(timestamp)) {
        this.lastVersionCheckTimestamp = timestamp;
        return timestamp;
      }
    }

    return null;
  }

  /**
   * Save last version check timestamp
   */
  private saveLastVersionCheckTimestamp(): void {
    const timestamp = Date.now();
    this.lastVersionCheckTimestamp = timestamp;
    try {
      localStorage.setItem(VERSION_CHECK_TIMESTAMP_KEY, timestamp.toString());
    } catch (e) {
      console.warn('[Songs Cache] Failed to save version check timestamp:', e);
    }
  }

  /**
   * Check if version check should be performed (at least 2 minutes since last check)
   */
  shouldCheckVersion(): boolean {
    const lastCheck = this.getLastVersionCheckTimestamp();
    if (lastCheck === null) {
      // Never checked, should check
      return true;
    }

    const timeSinceLastCheck = Date.now() - lastCheck;
    return timeSinceLastCheck >= VERSION_CHECK_INTERVAL;
  }

  /**
   * Check if cache is valid by comparing versions
   * Only checks if at least 2 minutes have passed since last check
   * Prevents multiple simultaneous version checks across all components
   */
  async isCacheValid(forceCheck = false): Promise<boolean> {
    const cachedVersion = this.getCachedVersion();
    if (cachedVersion === null) {
      console.log('[Songs Cache] No cached version found, cache invalid');
      return false;
    }

    // Check if we should perform version check (at least 2 minutes since last check)
    if (!forceCheck && !this.shouldCheckVersion()) {
      // If there's a pending check from another component, wait for it
      if (this.pendingVersionCheck) {
        console.log('[Songs Cache] Waiting for pending version check from another component...');
        return this.pendingVersionCheck;
      }

      const lastCheck = this.getLastVersionCheckTimestamp();
      const timeSinceLastCheck = lastCheck ? Date.now() - lastCheck : 0;
      const minutesSinceLastCheck = Math.floor(timeSinceLastCheck / 60000);
      // Don't log for every component - only log once
      if (!this.pendingVersionCheck) {
        console.log(
          `[Songs Cache] Skipping version check (last check ${minutesSinceLastCheck} minutes ago, need 2 minutes)`
        );
      }
      // Assume cache is valid if we're not checking (optimistic)
      return true;
    }

    // If version check is already in progress, reuse the promise
    if (this.pendingVersionCheck) {
      console.log('[Songs Cache] Version check already in progress, reusing promise');
      return this.pendingVersionCheck;
    }

    // Start version check (shared across all components)
    this.pendingVersionCheck = (async () => {
      try {
        console.log('[Songs Cache] Fetching version from /songs/version endpoint...');
        const { version } = await api.songs.getCollectionVersion();
        const isValid = version === cachedVersion;
        console.log(
          `[Songs Cache] Version check: cached=${cachedVersion}, server=${version}, valid=${isValid}`
        );

        // Save timestamp of this check
        this.saveLastVersionCheckTimestamp();

        return isValid;
      } catch (error) {
        console.error('[Songs Cache] Failed to check cache version:', error);
        // If we can't check version, assume cache is invalid
        return false;
      } finally {
        this.pendingVersionCheck = null;
      }
    })();

    return this.pendingVersionCheck;
  }

  private async validateCacheAndRefreshIfNeeded(skipVersionCheck = false): Promise<void> {
    if (skipVersionCheck) {
      // Version was already checked, just return
      return;
    }

    const isValid = await this.isCacheValid();
    if (!isValid) {
      console.log('[Songs Cache] Version mismatch detected, refreshing cache...');
      await this.refreshCache();
    }
  }

  /**
   * Refresh cache by fetching all songs from API
   */
  async refreshCache(): Promise<void> {
    // Prevent multiple simultaneous refresh calls
    if (this.isRefreshing && this.refreshPromise) {
      console.log('[Songs Cache] Refresh already in progress, reusing promise');
      return this.refreshPromise;
    }

    console.log('[Songs Cache] Refreshing cache from API...');
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const startTime = performance.now();
        const { version, songs } = await api.songs.getAllForCache();
        const duration = performance.now() - startTime;

        this.cache = {
          version,
          songs,
          timestamp: Date.now(),
        };

        console.log(
          `[Songs Cache] Cache refreshed: ${songs.length} songs, version ${version}, took ${duration.toFixed(2)}ms`
        );

        // Also store in localStorage as backup
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(songs));
          localStorage.setItem(VERSION_KEY, version.toString());
          console.log('[Songs Cache] Cache saved to localStorage');
        } catch (e) {
          console.warn('[Songs Cache] Failed to store songs in localStorage:', e);
        }
      } catch (error) {
        console.error('[Songs Cache] Failed to refresh songs cache:', error);
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Ensure cache is valid, refresh if needed
   * Returns immediately if cache exists in memory, no requests made
   * @param skipVersionCheck - If true, skip version validation (use when version was already checked)
   */
  async ensureValidCache(skipVersionCheck = false): Promise<SongListCacheItem[]> {
    // If we have cache in memory, return it immediately without any requests
    if (this.cache && this.cache.songs.length > 0) {
      console.log(
        '[Songs Cache] Using cached songs from memory:',
        this.cache.songs.length,
        'songs, version',
        this.cache.version
      );
      await this.validateCacheAndRefreshIfNeeded(skipVersionCheck);
      return this.cache.songs;
    }

    // Try to load from localStorage first
    const stored = localStorage.getItem(CACHE_KEY);
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (stored && storedVersion) {
      try {
        const parsedSongs = JSON.parse(stored);
        const version = parseInt(storedVersion, 10);
        if (parsedSongs && parsedSongs.length > 0) {
          // Restore cache from localStorage
          this.cache = {
            version,
            songs: parsedSongs,
            timestamp: Date.now(),
          };
          console.log(
            '[Songs Cache] Restored from localStorage:',
            parsedSongs.length,
            'songs, version',
            version
          );
          await this.validateCacheAndRefreshIfNeeded(skipVersionCheck);
          return this.cache.songs;
        }
      } catch (e) {
        console.error('[Songs Cache] Failed to parse cached songs from localStorage:', e);
        this.clearCache();
      }
    }

    // No cache at all, need to fetch (this will get version from /songs/all endpoint)
    console.log('[Songs Cache] No cache found, fetching version and songs from server...');
    await this.refreshCache();
    return this.cache!.songs;
  }

  /**
   * Get song by ID from cache
   */
  getSongById(id: string): SongListCacheItem | null {
    const songs = this.getCachedSongs();
    if (!songs) {
      console.log('[Songs Cache] getSongById: No cache available');
      return null;
    }

    const song = songs.find(s => s.id === id);
    if (song) {
      console.log('[Songs Cache] getSongById: Found song in cache:', id);
    } else {
      console.log('[Songs Cache] getSongById: Song not found in cache:', id);
    }
    return song || null;
  }

  /**
   * Search songs in cache
   */
  searchInCache(
    query: string,
    options?: {
      language?: string;
      tags?: string[];
    }
  ): SongListCacheItem[] {
    const songs = this.getCachedSongs();
    if (!songs) {
      console.log('[Songs Cache] Search: No cache available');
      return [];
    }

    const startTime = performance.now();
    const lowerQuery = query.toLowerCase();
    const results = songs.filter(song => {
      // Search in both title and lyrics content
      // Use searchTitle/searchLyrics (indexed, lowercase) for faster matching
      const matchesTitle =
        (song.searchTitle && song.searchTitle.includes(lowerQuery)) ||
        song.title.toLowerCase().includes(lowerQuery);

      const matchesLyrics = song.searchLyrics && song.searchLyrics.includes(lowerQuery);

      const matchesSearch = matchesTitle || matchesLyrics;

      // Filter by language
      const matchesLanguage = !options?.language || song.language === options.language;

      // Filter by tags
      const matchesTags =
        !options?.tags ||
        options.tags.length === 0 ||
        options.tags.some(tag => song.tags.some(t => t.name === tag || t.id === tag));

      return matchesSearch && matchesLanguage && matchesTags;
    });

    // Sort by title
    results.sort((a, b) => a.title.localeCompare(b.title));

    const duration = performance.now() - startTime;
    const titleMatches = results.filter(
      s =>
        (s.searchTitle && s.searchTitle.includes(lowerQuery)) ||
        s.title.toLowerCase().includes(lowerQuery)
    ).length;
    const lyricsMatches = results.filter(
      s => s.searchLyrics && s.searchLyrics.includes(lowerQuery)
    ).length;

    console.log(
      `[Songs Cache] Search "${query}": ${results.length} results (${titleMatches} title, ${lyricsMatches} lyrics) from ${songs.length} songs, took ${duration.toFixed(2)}ms (CACHE HIT)`
    );

    return results;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(VERSION_KEY);
  }

  /**
   * Invalidate cache (mark as needing refresh)
   */
  invalidateCache(): void {
    console.log('[Songs Cache] Cache invalidated');
    this.cache = null;
  }

  /**
   * Force refresh cache (used after mutations)
   */
  async forceRefresh(): Promise<void> {
    console.log('[Songs Cache] Force refreshing cache after mutation...');
    this.invalidateCache();
    await this.refreshCache();
  }
}

// Export singleton instance
export const songsCache = new SongsCacheService();
