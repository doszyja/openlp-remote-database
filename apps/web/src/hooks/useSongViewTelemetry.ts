import { useEffect, useRef } from 'react';
import type { SongViewContext } from '@openlp/shared';
import { api } from '../services/api';

const SESSION_KEY = 'song_view_session_id';

function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export type SongViewTelemetryOptions = {
  /** false when the song is shown only as a layout default (e.g. auto-open first on /songs). */
  enabled?: boolean;
};

/**
 * Records one view per song + context per browser tab session (no extra permissions).
 */
export function useSongViewTelemetry(
  songId: string | undefined,
  title: string | undefined,
  viewContext: SongViewContext,
  options?: SongViewTelemetryOptions,
) {
  const inFlightRef = useRef(false);

  useEffect(() => {
    inFlightRef.current = false;
  }, [songId, viewContext]);

  useEffect(() => {
    if (options?.enabled === false || !songId || !title?.trim() || inFlightRef.current) return;

    const dedupeKey = `song-view:${viewContext}:${songId}`;
    if (sessionStorage.getItem(dedupeKey)) return;

    const pagePath =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : undefined;

    inFlightRef.current = true;
    sessionStorage.setItem(dedupeKey, new Date().toISOString());

    void api.presentationEvents
      .recordBrowserView({
        mongoSongId: songId,
        title: title.trim(),
        sessionId: getOrCreateSessionId(),
        pagePath,
        viewContext,
        screenWidth: window.screen?.width,
        screenHeight: window.screen?.height,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer?.slice(0, 512) || undefined,
      })
      .catch(err => {
        console.warn('[useSongViewTelemetry] Failed to record view:', err);
        sessionStorage.removeItem(dedupeKey);
        inFlightRef.current = false;
      });
  }, [songId, title, viewContext, options?.enabled]);
}