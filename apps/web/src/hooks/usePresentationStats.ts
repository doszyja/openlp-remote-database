import { useQuery } from '@tanstack/react-query';
import type { SongViewGroupBy, SongViewSource } from '@openlp/shared';
import { api } from '../services/api';

export interface SongViewListFilters {
  clientId?: string;
  mongoSongId?: string;
  title?: string;
  source?: SongViewSource;
  deviceType?: string;
  viewContext?: string;
  authenticated?: 'true' | 'false';
  from?: string;
  to?: string;
}

export interface SongViewSummaryFilters {
  clientId?: string;
  days?: number;
  source?: SongViewSource;
  deviceType?: string;
  groupBy?: SongViewGroupBy;
}

export function useSongViewSummary(filters: SongViewSummaryFilters) {
  return useQuery({
    queryKey: ['songViewSummary', filters],
    queryFn: () => api.presentationEvents.getSummary(filters),
    staleTime: 60 * 1000,
  });
}

export function useSongViewEvents(
  page: number,
  limit: number,
  filters: SongViewListFilters,
) {
  return useQuery({
    queryKey: ['songViewEvents', page, limit, filters],
    queryFn: () => api.presentationEvents.getAll({ page, limit, ...filters }),
    staleTime: 60 * 1000,
  });
}

/** @deprecated Use useSongViewSummary */
export function usePresentationStats(clientId?: string, days = 30) {
  return useSongViewSummary({ clientId, days });
}

/** @deprecated Use useSongViewEvents */
export function usePresentationEvents(
  page: number,
  limit: number,
  clientId?: string,
) {
  return useSongViewEvents(page, limit, { clientId });
}