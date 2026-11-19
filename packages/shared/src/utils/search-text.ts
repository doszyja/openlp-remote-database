import type { SongListCacheItem } from '../dto/song-response.dto';

/** Polish letters that do not fully decompose with NFD (e.g. ł). */
const POLISH_FOLD: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

/**
 * Normalize text for search: lowercase, strip diacritics, ignore punctuation.
 */
export function normalizeSearchText(value: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, ch => POLISH_FOLD[ch] ?? ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegexForSearch(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Folded title (+ number) for API indexing */
export function buildSearchTitleFolded(title: string, number?: string | null): string {
  return normalizeSearchText([number, title].filter(Boolean).join(' '));
}

/** Folded lyrics for API indexing */
export function buildSearchLyricsFolded(searchLyrics: string): string {
  return normalizeSearchText(searchLyrics);
}

function getLyricsTextForSearch(
  song: Pick<SongListCacheItem, 'searchLyrics' | 'verses' | 'versesArray'>
): string {
  if (song.searchLyrics) {
    return song.searchLyrics;
  }
  if (song.verses && typeof song.verses === 'string') {
    return song.verses;
  }
  if (song.versesArray && Array.isArray(song.versesArray)) {
    return song.versesArray.map(v => v.content || '').join(' ');
  }
  return '';
}

export function getNormalizedTitleHaystack(
  song: Pick<SongListCacheItem, 'title' | 'searchTitle' | 'number'>
): string {
  return normalizeSearchText([song.number, song.searchTitle || song.title].filter(Boolean).join(' '));
}

export function getNormalizedLyricsHaystack(
  song: Pick<SongListCacheItem, 'searchLyrics' | 'verses' | 'versesArray'>
): string {
  return normalizeSearchText(getLyricsTextForSearch(song));
}

/**
 * Whether a cached list song matches a user search query (title, number, or lyrics).
 */
export function songMatchesSearchQuery(
  song: Pick<
    SongListCacheItem,
    'title' | 'searchTitle' | 'number' | 'searchLyrics' | 'verses' | 'versesArray'
  >,
  query: string
): boolean {
  const nq = normalizeSearchText(query);
  if (!nq) {
    return false;
  }

  const titleHaystack = getNormalizedTitleHaystack(song);
  if (titleHaystack.includes(nq)) {
    return true;
  }

  const lyricsHaystack = getNormalizedLyricsHaystack(song);
  return lyricsHaystack.length > 0 && lyricsHaystack.includes(nq);
}