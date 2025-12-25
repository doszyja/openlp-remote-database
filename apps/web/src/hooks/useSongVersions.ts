import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SongResponseDto } from '@openlp/shared';

export interface SongVersion {
  _id: string;
  songId: string;
  version: number;
  songData: SongResponseDto;
  changedBy?: string;
  changedByUsername?: string;
  changedByDiscordId?: string;
  changeReason?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  createdAt: string;
}

export interface VersionComparison {
  version1: SongVersion;
  version2: SongVersion;
  differences: Record<string, { old: unknown; new: unknown }>;
}

export function useSongVersions(songId: string) {
  return useQuery<SongVersion[]>({
    queryKey: ['song-versions', songId],
    queryFn: () => api.songs.getVersions(songId),
    enabled: !!songId,
  });
}

export function useSongVersion(songId: string, version: number) {
  return useQuery<SongVersion>({
    queryKey: ['song-version', songId, version],
    queryFn: () => api.songs.getVersion(songId, version),
    enabled: !!songId && !!version && version > 0 && Number.isInteger(version),
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ songId, version }: { songId: string; version: number }) =>
      api.songs.restoreVersion(songId, version),
    onSuccess: (_data, variables) => {
      // Invalidate song queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['song', variables.songId] });
      queryClient.invalidateQueries({ queryKey: ['song-versions', variables.songId] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    },
  });
}

export function useCompareVersions() {
  return useMutation({
    mutationFn: ({ songId, v1, v2 }: { songId: string; v1: number; v2: number }) =>
      api.songs.compareVersions(songId, v1, v2),
  });
}
