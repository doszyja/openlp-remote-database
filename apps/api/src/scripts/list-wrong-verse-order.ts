/**
 * List songs with verse-order issues:
 * 1) Wrong format (e.g. "verse 1 verse 2" instead of "v1 v2")
 * 2) Empty verseOrder but have verses (need default filled)
 *
 * Usage: pnpm run list:wrong-verse-order
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  normalizeVerseOrderString,
  defaultVerseOrderFromVerses,
} from '@openlp/shared';
import { Song } from '../schemas/song.schema';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const songModel = app.get<Model<Song>>(getModelToken(Song.name));

  // 1) Songs with non-empty verseOrder – check if wrong format
  const withVerseOrder = await songModel
    .find({ deletedAt: null, verseOrder: { $exists: true, $nin: [null, ''] } })
    .select('_id title verseOrder')
    .lean()
    .sort({ title: 1 })
    .exec();

  const wrongFormat: Array<{
    _id: string;
    title: string;
    verseOrder: string;
    normalized: string;
  }> = [];
  for (const song of withVerseOrder) {
    const current = (song.verseOrder as string)?.trim() ?? '';
    const normalized = normalizeVerseOrderString(current);
    if (normalized && normalized !== current) {
      wrongFormat.push({
        _id: String(song._id),
        title: song.title ?? '',
        verseOrder: current,
        normalized,
      });
    }
  }

  // 2) Songs with empty verseOrder but have verses (same filter as your query)
  const emptyVerseOrder = await songModel
    .find({
      deletedAt: null,
      verseOrder: { $in: [null, ''] },
      verses: { $exists: true, $ne: [], $type: 'array' },
    })
    .select('_id title verseOrder verses')
    .lean()
    .sort({ title: 1 })
    .exec();

  const emptyWithVerses: Array<{
    _id: string;
    title: string;
    wouldBe: string;
  }> = [];
  for (const song of emptyVerseOrder) {
    const verses = song.verses as Array<{
      order: number;
      originalLabel?: string;
      label?: string;
    }>;
    const wouldBe = defaultVerseOrderFromVerses(verses ?? []);
    emptyWithVerses.push({
      _id: String(song._id),
      title: song.title ?? '',
      wouldBe,
    });
  }

  console.log(
    `=== Wrong format (normalize needed): ${wrongFormat.length} ===\n`,
  );
  wrongFormat.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title}`);
    console.log(`   id: ${s._id}`);
    console.log(`   current:  "${s.verseOrder}"`);
    console.log(`   correct:  "${s.normalized}"`);
    console.log('');
  });

  console.log(
    `=== Empty verseOrder (fill needed): ${emptyWithVerses.length} ===\n`,
  );
  emptyWithVerses.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title}`);
    console.log(`   id: ${s._id}`);
    console.log(`   would be: "${s.wouldBe}"`);
    console.log('');
  });

  if (process.argv.includes('--json')) {
    console.log('--- JSON ---');
    console.log(
      JSON.stringify(
        { wrongFormat, emptyVerseOrder: emptyWithVerses },
        null,
        2,
      ),
    );
  }

  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
