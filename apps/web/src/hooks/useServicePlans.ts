import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { ServicePlan, CreateServicePlanDto, UpdateServicePlanDto, AddSongToPlanDto, SetActiveSongDto } from '@openlp/shared';

export function useServicePlans() {
  return useQuery<ServicePlan[]>({
    queryKey: ['service-plans'],
    queryFn: () => api.servicePlans.getAll(),
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000,
  });
}

export function useServicePlan(id: string) {
  return useQuery<ServicePlan>({
    queryKey: ['service-plan', id],
    queryFn: () => api.servicePlans.getById(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useActiveSong() {
  return useQuery({
    queryKey: ['service-plan', 'active'],
    queryFn: () => api.servicePlans.getActive(),
    refetchInterval: 2000, // Poll every 2 seconds for active song changes
    staleTime: 0, // Always consider stale to get latest active song
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
      queryClient.invalidateQueries({ queryKey: ['service-plan', data.id] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
      queryClient.invalidateQueries({ queryKey: ['service-plan', 'active'] });
    },
  });
}

