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