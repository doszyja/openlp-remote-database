import * as fs from 'fs';
import { createOpenLPSqliteDatabase } from './sqlite-export.util';

const Database = require('better-sqlite3');

function baseSong(overrides: Record<string, any>) {
  return {
    id: 'song-1',
    title: 'Test song',
    number: null,
    language: 'en',
    verses: '',
    versesArray: [],
    verseOrder: null,
    lyricsXml: null,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

async function readExportedSong(song: Record<string, any>) {
  const sqlitePath = await createOpenLPSqliteDatabase([song as any]);
  try {
    const db = new Database(sqlitePath, { readonly: true });
    try {
      return db
        .prepare('SELECT title, verse_order, lyrics FROM songs WHERE title = ?')
        .get(song.title);
    } finally {
      db.close();
    }
  } finally {
    fs.unlinkSync(sqlitePath);
  }
}

describe('SQLite export verse_order', () => {
  it('writes provided verseOrder to songs.verse_order', async () => {
    const row = await readExportedSong(
      baseSong({
        title: 'Provided verse order',
        verseOrder: 'v1 v2',
        versesArray: [
          {
            order: 1,
            content: 'First verse',
            label: 'Verse 1',
            originalLabel: 'verse 1',
          },
          {
            order: 2,
            content: 'Second verse',
            label: 'Verse 2',
            originalLabel: 'verse 2',
          },
        ],
      }),
    );

    expect(row.verse_order).toBe('v1 v2');
    expect(row.lyrics).toContain('<verse type="v" label="1"><![CDATA[First verse]]></verse>');
    expect(row.lyrics).toContain('<verse type="v" label="2"><![CDATA[Second verse]]></verse>');
  });

  it('normalizes readable verseOrder before writing SQLite', async () => {
    const row = await readExportedSong(
      baseSong({
        title: 'Readable verse order',
        verseOrder: 'verse 1 chorus 1 verse 2',
        versesArray: [
          {
            order: 1,
            content: 'First verse',
            label: 'Verse 1',
            originalLabel: 'verse 1',
          },
          {
            order: 2,
            content: 'Chorus',
            label: 'Chorus 1',
            originalLabel: 'chorus 1',
          },
          {
            order: 3,
            content: 'Second verse',
            label: 'Verse 2',
            originalLabel: 'verse 2',
          },
        ],
      }),
    );

    expect(row.verse_order).toBe('v1 c1 v2');
    expect(row.lyrics).toContain('<verse type="c" label="1"><![CDATA[Chorus]]></verse>');
  });

  it('fills verse_order from versesArray when verseOrder is empty', async () => {
    const row = await readExportedSong(
      baseSong({
        title: 'Fallback verse order',
        verseOrder: null,
        versesArray: [
          {
            order: 1,
            content: 'First verse',
            label: 'Verse 1',
            originalLabel: 'verse 1',
          },
          {
            order: 2,
            content: 'Chorus',
            originalLabel: 'chorus 1',
          },
          {
            order: 3,
            content: 'Bridge',
            label: 'Bridge 1',
          },
        ],
      }),
    );

    expect(row.verse_order).toBe('v1 c1 b1');
    expect(row.lyrics).toContain('<verse type="c" label="1"><![CDATA[Chorus]]></verse>');
    expect(row.lyrics).toContain('<verse type="b" label="1"><![CDATA[Bridge]]></verse>');
  });
});
