import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  ServicePlan,
  CreateServicePlanDto,
  UpdateServicePlanDto,
  AddSongToPlanDto,
  SetActiveSongDto,
  SetActiveVerseDto,
} from '@openlp/shared';

export function useServicePlans() {
  return useQuery<ServicePlan[]>({
    queryKey: ['service-plans'],
    queryFn: () => api.servicePlans.getAll(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (increased to reduce API calls)
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
  });
}

export function useServicePlan(id: string) {
  return useQuery<ServicePlan>({
    queryKey: ['service-plan', id],
    queryFn: () => api.servicePlans.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (increased to reduce API calls)
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
  });
}

/**
 * Hook do pobierania aktualnie aktywnej pieśni przez HTTP.
 *
 * Uwaga:
 * - Dla /live głównym kanałem jest WebSocket (useActiveSongWs),
 *   tutaj używamy tylko jednorazowego snapshotu jako fallback.
 * - Endpoint jest wywoływany tylko gdy enabled === true (domyślnie true).
 */
export function useActiveSong(enabled: boolean = true) {
  return useQuery({
    queryKey: ['service-plan', 'active'],
    queryFn: () => api.servicePlans.getActive(),
    // Bez automatycznego pollingu – WebSocket obsługuje real-time,
    // HTTP działa tylko jako snapshot/fallback.
    refetchInterval: false,
    staleTime: 0,
    enabled, // Wywołuj endpoint tylko gdy enabled === true
  });
}

export function useCreateServicePlan() {
  const queryClient = useQueryClient();

  return useMutation<ServicePlan, Error, CreateServicePlanDto>({
    mutationFn: (data) => api.servicePlans.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
    },
  });
}

export function useUpdateServicePlan() {
  const queryClient = useQueryClient();

  return useMutation<ServicePlan, Error, { id: string; data: UpdateServicePlanDto }>({
    mutationFn: ({ id, data }) => api.servicePlans.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
      queryClient.invalidateQueries({ queryKey: ['service-plan', data.id] });
      queryClient.invalidateQueries({ queryKey: ['service-plan', 'active'] });
    },
  });
}

export function useDeleteServicePlan() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => api.servicePlans.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
      queryClient.invalidateQueries({ queryKey: ['service-plan', 'active'] });
    },
  });
}

export function useAddSongToPlan() {
  const queryClient = useQueryClient();

  return useMutation<ServicePlan, Error, { planId: string; data: AddSongToPlanDto }>({
    mutationFn: ({ planId, data }) => api.servicePlans.addSong(planId, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
      queryClient.invalidateQueries({ queryKey: ['service-plan', data.id] });
      // Refresh songs cache to ensure newly added songs have verses
      const { songsCache } = await import('../services/songs-cache');
      try {
        await songsCache.forceRefresh();
        const refreshedSongs = songsCache.getCachedSongs();
        if (refreshedSongs) {
          // Update React Query cache with fresh data immediately
          queryClient.setQueryData(['cached-songs'], refreshedSongs);
          // Force refetch active queries to ensure all components get updated data
          // This works even with staleTime: Infinity because we're explicitly refetching
          await queryClient.refetchQueries({ 
            queryKey: ['cached-songs'],
            type: 'active', // Only refetch active queries
          });
        }
      } catch (error) {
        console.error('[useAddSongToPlan] Failed to refresh songs cache:', error);
        // Fallback: invalidate to trigger re-fetch
        queryClient.invalidateQueries({ queryKey: ['cached-songs'] });
      }
    },
  });
}

export function useRemoveSongFromPlan() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { planId: string; itemId: string }>({
    mutationFn: ({ planId, itemId }) => api.servicePlans.removeSong(planId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
      queryClient.invalidateQueries({ queryKey: ['service-plan', variables.planId] });
    },
  });
}

export function useSetActiveSong() {
  const queryClient = useQueryClient();

  return useMutation<ServicePlan, Error, { planId: string; data: SetActiveSongDto }>({
    mutationFn: ({ planId, data }) => api.servicePlans.setActiveSong(planId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
      // Odśwież szczegółowy widok konkretnego planu, w którym zmieniono aktywną pieśń
      if (variables?.planId) {
        queryClient.invalidateQueries({ queryKey: ['service-plan', variables.planId] });
      } else if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['service-plan', data.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['service-plan', 'active'] });
    },
  });
}

export function useSetActiveVerse() {
  const queryClient = useQueryClient();

  return useMutation<ServicePlan, Error, { planId: string; data: SetActiveVerseDto }>({
    mutationFn: ({ planId, data }) => api.servicePlans.setActiveVerse(planId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
      // Odśwież szczegółowy widok planu, żeby UI wiedziało, która pieśń/wers jest aktywny
      if (variables?.planId) {
        queryClient.invalidateQueries({ queryKey: ['service-plan', variables.planId] });
      }
      queryClient.invalidateQueries({ queryKey: ['service-plan', 'active'] });
    },
  });
}

