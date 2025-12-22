import { songsCache } from '../services/songs-cache';

/**
 * Debug utility to check cache status
 * Call this from browser console: window.checkCacheStatus()
 */
export function checkCacheStatus() {
  const cached = songsCache.getCachedSongs();
  const version = songsCache.getCachedVersion();

  const status = {
    hasCache: !!cached,
    songCount: cached?.length || 0,
    version: version,
    cacheSize: cached ? JSON.stringify(cached).length : 0,
    cacheSizeKB: cached ? (JSON.stringify(cached).length / 1024).toFixed(2) : 0,
  };

  console.log('=== Songs Cache Status ===');
  console.table(status);
  console.log('Cache data:', cached);

  return status;
}

// Make it available globally in development
if (import.meta.env.DEV) {
  (window as any).checkCacheStatus = checkCacheStatus;
  (window as any).clearSongsCache = () => {
    songsCache.clearCache();
    console.log('Songs cache cleared');
  };
  (window as any).songsCache = songsCache;
}
