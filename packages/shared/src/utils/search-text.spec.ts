import { describe, it, expect } from 'vitest';
import {
  normalizeSearchText,
  songMatchesSearchQuery,
  buildSearchTitleFolded,
} from './search-text';

describe('normalizeSearchText', () => {
  it('folds Polish diacritics and removes punctuation', () => {
    expect(normalizeSearchText('95. Święty, święty')).toBe('95 swiety swiety');
  });

  it('matches ASCII query to folded form', () => {
    const title = normalizeSearchText('95. Święty, święty');
    const query = normalizeSearchText('swiety swiety');
    expect(title.includes(query)).toBe(true);
  });

  it('folds żółć to zolc', () => {
    expect(normalizeSearchText('żółć')).toBe('zolc');
  });

  it('preserves digits', () => {
    expect(normalizeSearchText('95 abc')).toBe('95 abc');
  });
});

describe('songMatchesSearchQuery', () => {
  const song = {
    id: '1',
    title: '95. Święty, święty',
    number: null,
    searchTitle: '95. święty, święty',
    searchLyrics: 'święty panie nasz',
    verses: null,
    versesArray: undefined,
  };

  it('finds title without Polish chars or punctuation in query', () => {
    expect(songMatchesSearchQuery(song, 'swiety swiety')).toBe(true);
  });

  it('finds lyrics with ASCII query', () => {
    expect(songMatchesSearchQuery(song, 'swiety panie')).toBe(true);
  });

  it('returns false for empty normalized query', () => {
    expect(songMatchesSearchQuery(song, '   , . ')).toBe(false);
  });
});

describe('buildSearchTitleFolded', () => {
  it('includes number and title', () => {
    expect(buildSearchTitleFolded('Święty', '95')).toBe('95 swiety');
  });
});