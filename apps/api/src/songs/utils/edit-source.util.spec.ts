import { detectSongEditSource } from './edit-source.util';

describe('detectSongEditSource', () => {
  it('prefers explicit source', () => {
    expect(detectSongEditSource('Mozilla/5.0', { explicitSource: 'web' })).toBe(
      'web',
    );
    expect(detectSongEditSource('OpenLP', { explicitSource: 'web' })).toBe(
      'web',
    );
  });

  it('detects OpenLP via client metadata', () => {
    expect(detectSongEditSource(undefined, { clientId: 'plugin' })).toBe(
      'openlp',
    );
    expect(detectSongEditSource(undefined, { openlpId: 42 })).toBe('openlp');
  });

  it('detects OpenLP from user agent heuristics', () => {
    expect(detectSongEditSource('OpenLP SongStats/1.0')).toBe('openlp');
    expect(detectSongEditSource('python-requests/2.31')).toBe('openlp');
  });

  it('defaults to web for normal browsers', () => {
    expect(detectSongEditSource('Mozilla/5.0 Chrome/120')).toBe('web');
    expect(detectSongEditSource()).toBe('web');
  });
});
