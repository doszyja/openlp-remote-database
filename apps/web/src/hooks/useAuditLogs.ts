import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { AuditLog } from '@openlp/shared';

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditLogFilters {
  action?: string;
  username?: string;
  songId?: string;
  fromDate?: string;
  toDate?: string;
}

export function useAuditLogs(page: number = 1, limit: number = 50, filters?: AuditLogFilters) {
  return useQuery<AuditLogsResponse>({
    queryKey: ['auditLogs', page, limit, filters],
    queryFn: () => api.auditLogs.getAll(page, limit, filters),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
