/**
 * Fill empty verseOrder for songs in MongoDB using their verses array.
 * Sets verseOrder to default (e.g. "v1 v2 v3") from verses sorted by order.
 *
 * Usage: pnpm run fill-empty-verse-order
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { defaultVerseOrderFromVerses } from '@openlp/shared';
import { Song } from '../schemas/song.schema';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const songModel = app.get<Model<Song>>(getModelToken(Song.name));

  const songs = await songModel
    .find({
      deletedAt: null,
      verseOrder: { $in: [null, ''] },
      verses: { $exists: true, $ne: [], $type: 'array' },
    })
    .select('_id title verses')
    .lean()
    .sort({ title: 1 })
    .exec();

  let updated = 0;
  for (const song of songs) {
    const verses = song.verses as Array<{
      order: number;
      originalLabel?: string;
    }>;
    if (!verses?.length) continue;

    const verseOrder = defaultVerseOrderFromVerses(verses);
    if (!verseOrder) continue;

    await songModel.updateOne({ _id: song._id }, { $set: { verseOrder } });
    updated++;
    console.log(`Updated: "${song.title}" -> "${verseOrder}"`);
  }

  console.log(
    `\nDone. Filled verseOrder for ${updated} of ${songs.length} songs.`,
  );
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
