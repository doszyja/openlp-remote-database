export type SongEditSource = 'web' | 'openlp';

/**
 * Guess whether a save came from the OpenLP Song Stats plugin vs the web UI.
 */
export function detectSongEditSource(
  userAgent?: string,
  options?: {
    clientId?: string;
    openlpId?: number;
    explicitSource?: SongEditSource;
  },
): SongEditSource {
  if (options?.explicitSource) {
    return options.explicitSource;
  }
  if (options?.clientId || options?.openlpId != null) {
    return 'openlp';
  }
  const ua = (userAgent ?? '').toLowerCase();
  if (ua.includes('openlp') || ua.includes('songstats') || ua.includes('python-requests')) {
    return 'openlp';
  }
  return 'web';
}