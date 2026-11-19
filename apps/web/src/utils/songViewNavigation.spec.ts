import { describe, expect, it } from 'vitest';
import { isSkipAutoSongViewState, SKIP_AUTO_SONG_VIEW_STATE } from './songViewNavigation';

describe('songViewNavigation', () => {
  it('exports skip state flag', () => {
    expect(SKIP_AUTO_SONG_VIEW_STATE).toEqual({ skipSongViewTelemetry: true });
  });

  it('detects skip telemetry state', () => {
    expect(isSkipAutoSongViewState(SKIP_AUTO_SONG_VIEW_STATE)).toBe(true);
    expect(isSkipAutoSongViewState({ skipSongViewTelemetry: true })).toBe(true);
  });

  it('rejects non-skip states', () => {
    expect(isSkipAutoSongViewState(null)).toBe(false);
    expect(isSkipAutoSongViewState(undefined)).toBe(false);
    expect(isSkipAutoSongViewState({ skipSongViewTelemetry: false })).toBe(false);
    expect(isSkipAutoSongViewState('')).toBe(false);
  });
});
