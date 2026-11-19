import type { SongbookSlug, SongListCacheItem } from '@openlp/shared';
import { SONGBOOK_OPTIONS } from '../constants/songbookOptions';

const NAMED_SONGBOOKS: SongbookSlug[] = ['pielgrzym', 'zielony', 'wedrowiec'];

export function isZboroweSong(songbook: SongListCacheItem['songbook']): boolean {
  return (
    !songbook ||
    (songbook !== 'pielgrzym' && songbook !== 'zielony' && songbook !== 'wedrowiec')
  );
}

export function songMatchesSongbookFilter(
  song: SongListCacheItem,
  filter: SongbookSlug
): boolean {
  if (filter === 'zborowe') {
    return isZboroweSong(song.songbook);
  }
  return song.songbook === filter;
}

export function filterSongsBySongbooks<T extends SongListCacheItem>(
  songs: T[],
  selectedSongbooks: SongbookSlug[]
): T[] {
  if (selectedSongbooks.length === 0) {
    return songs;
  }
  return songs.filter(song =>
    selectedSongbooks.some(filter => songMatchesSongbookFilter(song, filter))
  );
}

export function parseStoredSongbookFilters(raw: string | null): SongbookSlug[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = new Set(SONGBOOK_OPTIONS.map(o => o.slug));
      return parsed.filter((s): s is SongbookSlug => typeof s === 'string' && valid.has(s as SongbookSlug));
    }
  } catch {
    const valid = SONGBOOK_OPTIONS.some(o => o.slug === raw);
    if (valid) {
      return [raw as SongbookSlug];
    }
  }
  return [];
}

/** @internal exported for tests if needed */
export { NAMED_SONGBOOKS };