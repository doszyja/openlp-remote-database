import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function usePresentationStats(clientId?: string, days = 30) {
  return useQuery({
    queryKey: ['presentationStats', clientId, days],
    queryFn: () => api.presentationEvents.getSummary(clientId, days),
    staleTime: 60 * 1000,
  });
}

export function usePresentationEvents(
  page: number,
  limit: number,
  clientId?: string,
) {
  return useQuery({
    queryKey: ['presentationEvents', page, limit, clientId],
    queryFn: () => api.presentationEvents.getAll(page, limit, clientId),
    staleTime: 60 * 1000,
  });
}