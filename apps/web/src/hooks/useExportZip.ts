import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

/**
 * Hook for exporting songs to ZIP with React Query caching
 * Prevents spam requests by caching the export for 5 minutes
 */
export function useExportZip() {
  return useQuery({
    queryKey: ['songs', 'export', 'zip'],
    queryFn: async () => {
      const blob = await api.songs.exportZip();
      return blob;
    },
    enabled: false, // Don't auto-fetch, only fetch when manually triggered
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
  });
}
