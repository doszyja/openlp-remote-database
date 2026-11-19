/**
 * Backfill searchTitleFolded and searchLyricsFolded for all songs.
 *
 * Usage: pnpm --filter api run backfill:search-folded
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  buildSearchLyricsFolded,
  buildSearchTitleFolded,
} from '@openlp/shared';
import { Song } from '../schemas/song.schema';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const songModel = app.get<Model<Song>>(getModelToken(Song.name));

  const songs = await songModel
    .find({ deletedAt: null })
    .select('_id title number searchTitle searchLyrics verses')
    .lean()
    .exec();

  let updated = 0;
  for (const song of songs) {
    let searchLyrics = song.searchLyrics ?? '';
    if (!searchLyrics && Array.isArray(song.verses)) {
      searchLyrics = song.verses
        .map((v: { content?: string }) => v.content ?? '')
        .join('\n\n')
        .toLowerCase()
        .trim();
    }

    const searchTitleFolded = buildSearchTitleFolded(
      song.title ?? '',
      song.number ?? null,
    );
    const searchLyricsFolded = buildSearchLyricsFolded(searchLyrics);

    await songModel.updateOne(
      { _id: song._id },
      { $set: { searchTitleFolded, searchLyricsFolded } },
    );
    updated++;
  }

  console.log(`Backfilled search folded fields for ${updated} songs.`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
