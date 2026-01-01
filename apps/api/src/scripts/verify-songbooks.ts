/**
 * Script to verify songbook assignments in MongoDB
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/verify-songbooks.ts
 */

import { connect, model, Schema, disconnect } from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Song schema (simplified for script)
const SongSchema = new Schema(
  {
    title: String,
    songbook: String,
    deletedAt: Date,
  },
  { timestamps: true, strict: false },
);

const Song = model('Song', SongSchema);

async function main() {
  const mongoUri =
    process.env.DATABASE_URL || 'mongodb://localhost:27017/openlp_db';

  console.log('Connecting to MongoDB...');
  await connect(mongoUri);
  console.log('Connected to MongoDB');

  try {
    // Count songs by songbook
    const pielgrzymCount = await Song.countDocuments({
      songbook: 'pielgrzym',
      deletedAt: null,
    });
    const zielonyCount = await Song.countDocuments({
      songbook: 'zielony',
      deletedAt: null,
    });
    const wedrowiecCount = await Song.countDocuments({
      songbook: 'wedrowiec',
      deletedAt: null,
    });
    const zboroweCount = await Song.countDocuments({
      songbook: 'zborowe',
      deletedAt: null,
    });
    const noSongbookCount = await Song.countDocuments({
      $or: [{ songbook: null }, { songbook: { $exists: false } }],
      deletedAt: null,
    });
    const totalCount = await Song.countDocuments({ deletedAt: null });

    console.log('\n=== Songbook Statistics in MongoDB ===');
    console.log(`Pielgrzym: ${pielgrzymCount}`);
    console.log(`Zielony: ${zielonyCount}`);
    console.log(`Wędrowiec: ${wedrowiecCount}`);
    console.log(`Zborowe: ${zboroweCount}`);
    console.log(`No songbook: ${noSongbookCount}`);
    console.log(`Total: ${totalCount}`);

    // Show sample songs for each category
    console.log('\n=== Sample Pielgrzym songs ===');
    const samplePielgrzym = await Song.find({
      songbook: 'pielgrzym',
      deletedAt: null,
    })
      .limit(5)
      .lean();
    for (const s of samplePielgrzym) {
      console.log(`  - ${s.title} (songbook: ${s.songbook})`);
    }

    console.log('\n=== Sample Zielony songs ===');
    const sampleZielony = await Song.find({
      songbook: 'zielony',
      deletedAt: null,
    })
      .limit(5)
      .lean();
    for (const s of sampleZielony) {
      console.log(`  - ${s.title} (songbook: ${s.songbook})`);
    }

    console.log('\n=== Sample Wędrowiec songs ===');
    const sampleWedrowiec = await Song.find({
      songbook: 'wedrowiec',
      deletedAt: null,
    })
      .limit(5)
      .lean();
    for (const s of sampleWedrowiec) {
      console.log(`  - ${s.title} (songbook: ${s.songbook})`);
    }

    console.log('\n=== Sample Zborowe songs ===');
    const sampleZborowe = await Song.find({
      songbook: 'zborowe',
      deletedAt: null,
    })
      .limit(5)
      .lean();
    for (const s of sampleZborowe) {
      console.log(`  - ${s.title} (songbook: ${s.songbook})`);
    }

    if (noSongbookCount > 0) {
      console.log('\n=== Songs without songbook ===');
      const noSongbook = await Song.find({
        $or: [{ songbook: null }, { songbook: { $exists: false } }],
        deletedAt: null,
      })
        .limit(5)
        .lean();
      for (const s of noSongbook) {
        console.log(`  - ${s.title} (songbook: ${s.songbook})`);
      }
    }

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
