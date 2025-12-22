import type { SongResponseDto } from '@openlp/shared';

const DEFAULT_TIMESTAMP = new Date('2025-01-15T12:00:00.000Z');

interface VerseFixture {
  label: string;
  content: string;
}

export function buildVersesXml(verses: VerseFixture[]): string {
  return verses.map(({ label, content }) => `<verse label="${label}">${content}</verse>`).join('');
}

export function buildSong(id: string, overrides: Partial<SongResponseDto> = {}): SongResponseDto {
  return {
    id,
    title: `Pieśń ${id}`,
    number: null,
    language: 'pl',
    chorus: null,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    deletedAt: null,
    verses: buildVersesXml([
      { label: 'v1', content: 'Linia 1\nLinia 2' },
      { label: 'c1', content: 'Refren' },
    ]),
    tags: [],
    ...overrides,
  };
}

export const baseSongs: SongResponseDto[] = [
  buildSong('song-1', {
    title: 'Światło Świata',
    number: '101',
    tags: [{ id: 'tag-worship', name: 'Uwielbienie' }],
    verses: buildVersesXml([
      { label: 'v1', content: 'Światło świata przyszło tu' },
      { label: 'c1', content: 'To jest refren światła' },
    ]),
    chorus: 'To jest refren światła',
  }),
  buildSong('song-2', {
    title: 'Żywa Nadzieja',
    tags: [{ id: 'tag-hope', name: 'Nadzieja' }],
    verses: buildVersesXml([
      { label: 'v1', content: 'Nadzieja żywa w sercu mym' },
      { label: 'c1', content: 'Refren nadziei powraca' },
    ]),
  }),
  buildSong('song-3', {
    title: 'Pieśń Łaski',
    tags: [{ id: 'tag-grace', name: 'Łaska' }],
    verses: buildVersesXml([{ label: 'v1', content: 'Łaska płynie jak rzeka' }]),
  }),
];
