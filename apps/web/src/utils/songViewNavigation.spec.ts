import { describe, expect, it } from 'vitest';
import {
  isSkipAutoSongViewState,
  shouldRecordSongDetailView,
  SKIP_AUTO_SONG_VIEW_STATE,
} from './songViewNavigation';

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

  it('records anonymous views even on auto-first-song navigation', () => {
    expect(shouldRecordSongDetailView(true, false)).toBe(true);
    expect(shouldRecordSongDetailView(false, false)).toBe(true);
  });

  it('skips auto-first-song telemetry only for authenticated users', () => {
    expect(shouldRecordSongDetailView(true, true)).toBe(false);
    expect(shouldRecordSongDetailView(false, true)).toBe(true);
  });
});
