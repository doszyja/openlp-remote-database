/** Set on React Router state when navigation only auto-selects a song (not intentional viewing). */
export const SKIP_AUTO_SONG_VIEW_STATE = { skipSongViewTelemetry: true as const };

export function isSkipAutoSongViewState(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'skipSongViewTelemetry' in state &&
    (state as { skipSongViewTelemetry?: boolean }).skipSongViewTelemetry === true
  );
}

/**
 * Logged-in editors: skip telemetry when /songs auto-opens the first song (layout default).
 * Anonymous visitors: always record — that auto-open is a real browse view.
 */
export function shouldRecordSongDetailView(
  skipAutoSongView: boolean,
  isAuthenticated: boolean,
): boolean {
  if (!isAuthenticated) {
    return true;
  }
  return !skipAutoSongView;
}