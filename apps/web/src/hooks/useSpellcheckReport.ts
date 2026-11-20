import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { SpellcheckIssue, SpellcheckReportResponse } from '@openlp/shared';
import { api } from '../services/api';

export interface SpellcheckScanFilters {
  songbook?: string;
  language?: string;
  batchSize?: number;
}

export function useSpellcheckReport() {
  const [issues, setIssues] = useState<SpellcheckIssue[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [totalScanned, setTotalScanned] = useState(0);
  const [lastMeta, setLastMeta] = useState<
    SpellcheckReportResponse['meta'] | null
  >(null);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [autoScanError, setAutoScanError] = useState<Error | null>(null);

  const applyBatch = useCallback(
    (data: SpellcheckReportResponse, reset: boolean) => {
      setLastMeta(data.meta);
      setCursor(data.nextCursor);
      setTotalScanned(data.meta.totalScanned);
      setIssues((prev) => (reset ? data.issues : [...prev, ...data.issues]));
    },
    [],
  );

  const mutation = useMutation({
    mutationFn: (params: {
      reset: boolean;
      cursor?: string;
      totalScanned: number;
      filters: SpellcheckScanFilters;
    }) =>
      api.spellcheck.getReport({
        cursor: params.reset ? undefined : params.cursor,
        totalScanned: params.reset ? 0 : params.totalScanned,
        batchSize: params.filters.batchSize ?? 25,
        songbook: params.filters.songbook,
        language: params.filters.language,
      }),
    onSuccess: (data, variables) => {
      applyBatch(data, variables.reset);
    },
  });

  const startScan = useCallback(
    (filters: SpellcheckScanFilters) => {
      setAutoScanError(null);
      setIssues([]);
      setCursor(null);
      setTotalScanned(0);
      mutation.mutate({ reset: true, totalScanned: 0, filters });
    },
    [mutation],
  );

  const continueScan = useCallback(
    (filters: SpellcheckScanFilters) => {
      if (!cursor) return;
      setAutoScanError(null);
      mutation.mutate({
        reset: false,
        cursor,
        totalScanned,
        filters,
      });
    },
    [cursor, mutation, totalScanned],
  );

  const scanAll = useCallback(
    async (filters: SpellcheckScanFilters) => {
      setAutoScanError(null);
      setIsAutoScanning(true);
      setIssues([]);
      setCursor(null);
      setTotalScanned(0);
      setLastMeta(null);

      try {
        let nextCursor: string | undefined;
        let scanned = 0;
        let aggregated: SpellcheckIssue[] = [];
        let meta: SpellcheckReportResponse['meta'] | null = null;

        do {
          const data = await api.spellcheck.getReport({
            cursor: nextCursor,
            totalScanned: scanned,
            batchSize: filters.batchSize ?? 25,
            songbook: filters.songbook,
            language: filters.language,
          });
          aggregated = [...aggregated, ...data.issues];
          scanned = data.meta.totalScanned;
          meta = data.meta;
          nextCursor = data.nextCursor ?? undefined;
          setIssues(aggregated);
          setTotalScanned(scanned);
          setCursor(data.nextCursor);
          setLastMeta(meta);
        } while (nextCursor);
      } catch (err) {
        setAutoScanError(
          err instanceof Error ? err : new Error('Skanowanie przerwane'),
        );
      } finally {
        setIsAutoScanning(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setIssues([]);
    setCursor(null);
    setTotalScanned(0);
    setLastMeta(null);
    setAutoScanError(null);
    mutation.reset();
  }, [mutation]);

  const isScanning = mutation.isPending || isAutoScanning;

  return {
    issues,
    cursor,
    totalScanned,
    lastMeta,
    isScanning,
    isAutoScanning,
    error: autoScanError ?? mutation.error,
    startScan,
    continueScan,
    scanAll,
    reset,
    hasMore: Boolean(cursor),
  };
}