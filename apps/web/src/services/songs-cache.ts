import type { SongListCacheItem } from '@openlp/shared';
import {
  normalizeSearchText,
  songMatchesSearchQuery,
  getNormalizedTitleHaystack,
  getNormalizedLyricsHaystack,
  escapeRegexForSearch,
} from '@openlp/shared';
import { api } from './api';

const CACHE_KEY = 'songs_cache';
const VERSION_KEY = 'songs_cache_version';
const VERSION_CHECK_TIMESTAMP_KEY = 'songs_cache_version_check_timestamp';
const VERSION_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const IDB_NAME = 'openlp-songs';
const IDB_STORE = 'catalog';
const IDB_KEY = 'current';

interface SongsCache {
  version: number;
  songs: SongListCacheItem[];
  timestamp: number;
}

/**
 * Songs cache service for storing all songs in browser memory
 * Uses version checking to determine if cache needs to be refreshed
 */
function openSongsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class SongsCacheService {
  private cache: SongsCache | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;
  private lastVersionCheckTimestamp: number | null = null;
  private pendingVersionCheck: Promise<boolean> | null = null; // Global promise for all components
  /** First catalog validation after full page reload must hit GET /songs/version. */
  private forceVersionCheckPending = true;

  /**
   * Get cached songs from memory
   */
  getCachedSongs(): SongListCacheItem[] | null {
    return this.cache?.songs ?? null;
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
        const serverVersion = Number(version);
        const isValid = serverVersion === cachedVersion;
        console.log(
          `[Songs Cache] Version check: cached=${cachedVersion}, server=${version}, valid=${isValid}`
        );

        // Save timestamp of this check
        this.saveLastVersionCheckTimestamp();

        return isValid;
      } catch (error) {
        console.error('[Songs Cache] Failed to check cache version:', error);
        // Keep the catalog we already have instead of downloading /songs/all
        return true;
      } finally {
        this.pendingVersionCheck = null;
      }
    })();

    return this.pendingVersionCheck;
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

        const nextCache: SongsCache = {
          version,
          songs,
          timestamp: Date.now(),
        };
        this.cache = nextCache;

        console.log(
          `[Songs Cache] Cache refreshed: ${songs.length} songs, version ${version}, took ${duration.toFixed(2)}ms`
        );

        await this.persistCache(nextCache);
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
   * Load songs once.
   * No saved catalog: GET /songs/all (response already includes version).
   * Saved catalog: GET /songs/version, and GET /songs/all only when it changed.
   */
  async ensureValidCache(skipVersionCheck = false): Promise<SongListCacheItem[]> {
    if (!this.cache?.songs.length) {
      await this.hydrateFromStorage();
    }

    if (!this.cache?.songs.length) {
      console.log('[Songs Cache] No cache found, fetching /songs/all...');
      await this.refreshCache();
      return this.cache?.songs ?? [];
    }

    console.log(
      '[Songs Cache] Using saved catalog:',
      this.cache.songs.length,
      'songs, version',
      this.cache.version
    );

    if (!skipVersionCheck) {
      const forceCheck = this.forceVersionCheckPending;
      if (forceCheck) {
        this.forceVersionCheckPending = false;
      }
      const isValid = await this.isCacheValid(forceCheck);
      if (!isValid) {
        console.log('[Songs Cache] Version mismatch, fetching /songs/all...');
        await this.refreshCache();
      }
    }

    return this.cache?.songs ?? [];
  }

  private async hydrateFromStorage(): Promise<void> {
    const fromIdb = await this.readIndexedDb();
    if (fromIdb?.songs.length) {
      this.cache = fromIdb;
      console.log(
        '[Songs Cache] Restored from IndexedDB:',
        fromIdb.songs.length,
        'songs, version',
        fromIdb.version
      );
      return;
    }

    const stored = localStorage.getItem(CACHE_KEY);
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (!stored || storedVersion === null) {
      return;
    }

    try {
      const parsedSongs = JSON.parse(stored) as SongListCacheItem[];
      const version = parseInt(storedVersion, 10);
      if (!parsedSongs?.length || Number.isNaN(version)) {
        return;
      }
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
      await this.persistCache(this.cache);
    } catch (e) {
      console.error('[Songs Cache] Failed to parse cached songs from localStorage:', e);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  private async persistCache(cache: SongsCache): Promise<void> {
    try {
      await this.writeIndexedDb(cache);
      localStorage.setItem(VERSION_KEY, cache.version.toString());
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache.songs));
      } catch (e) {
        // Full catalog does not fit in localStorage. Drop the stale blob so the
        // next load uses IndexedDB instead of treating an old list as current.
        localStorage.removeItem(CACHE_KEY);
        console.warn('[Songs Cache] Songs exceed localStorage quota, kept in IndexedDB:', e);
      }
    } catch (e) {
      console.warn('[Songs Cache] Failed to persist songs cache:', e);
    }
  }

  private async readIndexedDb(): Promise<SongsCache | null> {
    try {
      const db = await openSongsDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const request = tx.objectStore(IDB_STORE).get(IDB_KEY);
        request.onsuccess = () => {
          const value = request.result as SongsCache | undefined;
          resolve(value?.songs?.length ? value : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('[Songs Cache] Failed to read IndexedDB:', e);
      return null;
    }
  }

  private async writeIndexedDb(cache: SongsCache): Promise<void> {
    const db = await openSongsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(cache, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async deleteIndexedDb(): Promise<void> {
    try {
      const db = await openSongsDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[Songs Cache] Failed to clear IndexedDB:', e);
    }
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
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return [];
    }

    const results = songs.filter(song => {
      const matchesSearch = songMatchesSearchQuery(song, query);

      // Filter by language
      const matchesLanguage = !options?.language || song.language === options.language;

      // Filter by tags
      const matchesTags =
        !options?.tags ||
        options.tags.length === 0 ||
        options.tags.some(tag => song.tags.some(t => t.name === tag || t.id === tag));

      return matchesSearch && matchesLanguage && matchesTags;
    });

    // Sort: prioritize exact matches, then word-boundary matches, then contains matches
    results.sort((a, b) => {
      const aTitle = getNormalizedTitleHaystack(a);
      const bTitle = getNormalizedTitleHaystack(b);

      const aExactMatch = aTitle === normalizedQuery;
      const bExactMatch = bTitle === normalizedQuery;
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      const aStartsWith = aTitle.startsWith(normalizedQuery);
      const bStartsWith = bTitle.startsWith(normalizedQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      const wordBoundaryRegex = new RegExp(
        `(^|\\s|[^0-9])${escapeRegexForSearch(normalizedQuery)}`
      );
      const aWordBoundary = wordBoundaryRegex.test(aTitle);
      const bWordBoundary = wordBoundaryRegex.test(bTitle);
      if (aWordBoundary && !bWordBoundary) return -1;
      if (!aWordBoundary && bWordBoundary) return 1;

      const aTitleContains = aTitle.includes(normalizedQuery);
      const bTitleContains = bTitle.includes(normalizedQuery);
      if (aTitleContains && !bTitleContains) return -1;
      if (!aTitleContains && bTitleContains) return 1;

      return a.title.localeCompare(b.title, 'pl');
    });

    const duration = performance.now() - startTime;
    const titleMatches = results.filter(s => getNormalizedTitleHaystack(s).includes(normalizedQuery))
      .length;
    const lyricsMatches = results.filter(
      s =>
        getNormalizedLyricsHaystack(s).includes(normalizedQuery) &&
        !getNormalizedTitleHaystack(s).includes(normalizedQuery)
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
    void this.deleteIndexedDb();
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
