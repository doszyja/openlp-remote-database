/**
 * One-time script to normalize verseOrder in MongoDB from readable format to short format.
 * e.g. "verse 1 verse 2 chorus 1" -> "v1 v2 c1"
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/normalize-verse-order-in-db.ts
 * Or:    pnpm exec ts-node -r tsconfig-paths/register apps/api/src/scripts/normalize-verse-order-in-db.ts (from repo root)
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizeVerseOrderString } from '@openlp/shared';
import { Song } from '../schemas/song.schema';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const songModel = app.get<Model<Song>>(getModelToken(Song.name));

  const songs = await songModel
    .find({ deletedAt: null, verseOrder: { $exists: true, $nin: [null, ''] } })
    .select('_id title verseOrder')
    .lean()
    .exec();

  let updated = 0;
  for (const song of songs) {
    const current = (song.verseOrder as string)?.trim() ?? '';
    const normalized = normalizeVerseOrderString(current);
    if (normalized && normalized !== current) {
      await songModel.updateOne(
        { _id: song._id },
        { $set: { verseOrder: normalized } },
      );
      updated++;
      console.log(`Updated: "${song.title}"`);
      console.log(`  Before: "${current}"`);
      console.log(`  After:  "${normalized}"`);
    }
  }

  console.log(
    `\nDone. Updated ${updated} of ${songs.length} songs with verseOrder.`,
  );
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
