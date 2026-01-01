/**
 * Script to assign songs to songbooks (categories) based on zip files
 *
 * Usage: npx ts-node src/scripts/assign-songbooks.ts
 *
 * This script:
 * 1. Creates songbook categories if they don't exist
 * 2. Reads song titles from zip files (pielgrzym.zip, nowego-zycia.zip, wedrowiec.zip)
 * 3. Matches songs in the database by title
 * 4. Assigns the appropriate songbook to each song
 */

import { connect, model, Schema, disconnect } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Songbook schema (inline for script)
const SongbookSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    order: { type: Number, default: 0 },
    color: { type: String, default: '#666666' },
  },
  { timestamps: true },
);

// Song schema (simplified for script)
const SongSchema = new Schema(
  {
    title: String,
    songbook: String,
    deletedAt: Date,
  },
  { timestamps: true, strict: false },
);

const Songbook = model('Songbook', SongbookSchema);
const Song = model('Song', SongSchema);

// Songbook definitions
const SONGBOOKS = [
  {
    slug: 'pielgrzym',
    name: 'Pielgrzym',
    description: 'Śpiewnik Pielgrzyma',
    order: 1,
    color: '#1976d2', // blue
  },
  {
    slug: 'zielony',
    name: 'Zielony (Nowego Życia)',
    description: 'Pieśni Nowego Życia',
    order: 2,
    color: '#388e3c', // green
  },
  {
    slug: 'wedrowiec',
    name: 'Wędrowiec',
    description: 'Śpiewnik Wędrowiec',
    order: 3,
    color: '#f57c00', // orange
  },
  {
    slug: 'zborowe',
    name: 'Zborowe',
    description: 'Pieśni zborowe (nie należące do żadnego śpiewnika)',
    order: 4,
    color: '#7b1fa2', // purple
  },
];

// Normalize title for comparison
function normalizeTitle(title: string): string {
  if (!title) return '';

  let normalized = title.toLowerCase();

  // Remove leading number/prefix patterns:
  // - Arabic digits: "001. " or "001 "
  // - Roman numerals: "XI. " or "xi. "
  // - Letter + digits: "A06. " or "A06 " (common in zip files)
  // - Letter + dot + digits: "A.06. " or "A.06 "
  // Important: Roman numerals must be followed by a dot to avoid matching words starting with 'c', 'd', 'i', 'l', 'm', 'v', 'x'
  normalized = normalized.replace(
    /^(?:\d+\.?\s*|[ivxlcdm]+\.\s*|[a-z]\.?\d+\.?\s*)/i,
    '',
  );

  // Remove file extension (e.g., .osz, .xml)
  normalized = normalized.replace(/\.[^.]+$/, '');

  // Remove non-alphanumeric (keep unicode letters and numbers)
  normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, '');

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

// Calculate similarity between two strings (improved)
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  // Check if one contains the other (high similarity)
  if (str1.includes(str2) || str2.includes(str1)) {
    const minLen = Math.min(str1.length, str2.length);
    const maxLen = Math.max(str1.length, str2.length);
    return minLen / maxLen; // More accurate than fixed 0.8
  }

  // Word-based similarity (more accurate)
  const words1 = str1.split(/\s+/).filter((w) => w.length > 0);
  const words2 = str2.split(/\s+/).filter((w) => w.length > 0);

  if (words1.length === 0 || words2.length === 0) return 0.0;

  // Count common words
  const commonWords = words1.filter((w) => words2.includes(w));
  const allWords = new Set([...words1, ...words2]);

  // Jaccard similarity: intersection / union
  return commonWords.length / allWords.size;
}

// Find best matching title from a set using fuzzy matching
function findBestMatch(
  normalizedTitle: string,
  candidateSet: Set<string>,
  threshold: number = 0.6,
): { match: string | null; similarity: number } {
  let bestMatch: string | null = null;
  let bestSimilarity = 0;

  // First try exact match (fast path)
  if (candidateSet.has(normalizedTitle)) {
    return { match: normalizedTitle, similarity: 1.0 };
  }

  // Try fuzzy matching
  for (const candidate of candidateSet) {
    const similarity = calculateSimilarity(normalizedTitle, candidate);
    if (similarity > bestSimilarity && similarity >= threshold) {
      bestSimilarity = similarity;
      bestMatch = candidate;
    }
  }

  return { match: bestMatch, similarity: bestSimilarity };
}

// Extract song titles from a zip file
async function extractTitlesFromZip(zipPath: string): Promise<string[]> {
  const titles: string[] = [];

  if (!fs.existsSync(zipPath)) {
    console.error(`Zip file not found: ${zipPath}`);
    return titles;
  }

  const directory = await unzipper.Open.file(zipPath);

  for (const file of directory.files) {
    // Skip directories and hidden files
    if (
      file.type === 'Directory' ||
      file.path.startsWith('.') ||
      file.path.includes('/.')
    ) {
      continue;
    }

    // Get filename without path
    const filename = path.basename(file.path);

    // Skip if it's a directory marker or system file
    if (!filename || filename.startsWith('.') || filename === '__MACOSX') {
      continue;
    }

    // Extract title from filename (remove number prefix and file extension)
    // Use the same normalization as normalizeTitle for consistency
    let title = normalizeTitle(filename);

    // If normalizeTitle removed everything (edge case), use original filename without extension
    if (!title || title.trim().length === 0) {
      title = filename.replace(/\.[^.]+$/, '').trim();
    }

    if (title) {
      titles.push(title.trim());
    }
  }

  console.log(
    `Extracted ${titles.length} titles from ${path.basename(zipPath)}`,
  );
  return titles;
}

async function main() {
  const mongoUri =
    process.env.DATABASE_URL || 'mongodb://localhost:27017/openlp_db';

  console.log('Connecting to MongoDB...');
  await connect(mongoUri);
  console.log('Connected to MongoDB');

  try {
    // Step 1: Create or update songbooks
    console.log('\n=== Creating songbooks ===');
    for (const sb of SONGBOOKS) {
      const existing = await Songbook.findOne({ slug: sb.slug });
      if (existing) {
        await Songbook.updateOne({ slug: sb.slug }, sb);
        console.log(`Updated songbook: ${sb.name}`);
      } else {
        await Songbook.create(sb);
        console.log(`Created songbook: ${sb.name}`);
      }
    }

    // Step 2: Extract titles from zip files
    console.log('\n=== Extracting song titles from zip files ===');
    const songbooksDir = path.join(__dirname, '..', '..', 'songbooks');

    const pielgrzymZip = path.join(songbooksDir, 'pielgrzym.zip');
    const nowegoZyciaZip = path.join(songbooksDir, 'nowego-zycia.zip');
    const wedrowiecZip = path.join(songbooksDir, 'wedrowiec.zip');

    const pielgrzymTitles = await extractTitlesFromZip(pielgrzymZip);
    const nowegoZyciaTitles = await extractTitlesFromZip(nowegoZyciaZip);
    const wedrowiecTitles = await extractTitlesFromZip(wedrowiecZip);

    // Normalize titles for comparison
    const pielgrzymNormalized = new Set(pielgrzymTitles.map(normalizeTitle));
    const nowegoZyciaNormalized = new Set(
      nowegoZyciaTitles.map(normalizeTitle),
    );
    const wedrowiecNormalized = new Set(wedrowiecTitles.map(normalizeTitle));

    console.log(`\nPielgrzym titles (normalized): ${pielgrzymNormalized.size}`);
    console.log(
      `Nowego Życia titles (normalized): ${nowegoZyciaNormalized.size}`,
    );
    console.log(`Wędrowiec titles (normalized): ${wedrowiecNormalized.size}`);

    // Debug: Show sample original titles with different prefix formats
    console.log(
      `\n=== Sample original titles from pielgrzym.zip (showing prefix patterns) ===`,
    );
    const prefixPatterns = new Map<string, number>();
    pielgrzymTitles.slice(0, 50).forEach((title) => {
      // Extract prefix pattern
      const prefixMatch = title.match(/^([^a-ząćęłńóśźż]+)/i);
      if (prefixMatch) {
        const prefix = prefixMatch[1];
        prefixPatterns.set(prefix, (prefixPatterns.get(prefix) || 0) + 1);
      }
    });

    // Show most common prefixes
    const sortedPrefixes = Array.from(prefixPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    console.log('Most common prefix patterns:');
    sortedPrefixes.forEach(([prefix, count]) => {
      console.log(`  "${prefix}" (${count} times)`);
    });

    // Show examples of titles with "choćbym" or "wszystko miał"
    console.log(
      `\n=== All titles containing "choćbym" or "wszystko miał" in pielgrzym.zip ===`,
    );
    const matchingTitles = pielgrzymTitles.filter((t) => {
      const lower = t.toLowerCase();
      return (
        lower.includes('choćbym') ||
        lower.includes('chocbym') ||
        (lower.includes('wszystko') && lower.includes('miał'))
      );
    });
    if (matchingTitles.length > 0) {
      matchingTitles.forEach((t) => {
        const normalized = normalizeTitle(t);
        console.log(`  Original: "${t}"`);
        console.log(`  Normalized: "${normalized}"`);
        console.log(`  In set: ${pielgrzymNormalized.has(normalized)}`);
        console.log('');
      });
    } else {
      console.log('  No titles found');
    }

    // Debug: Show sample titles from wedrowiec.zip
    if (wedrowiecTitles.length > 0) {
      console.log('\n=== Sample titles from wedrowiec.zip (first 10) ===');
      for (let i = 0; i < Math.min(10, wedrowiecTitles.length); i++) {
        const original = wedrowiecTitles[i];
        const normalized = normalizeTitle(original);
        console.log(`  "${original}" -> normalized: "${normalized}"`);
      }
    } else {
      console.log('\n⚠️  WARNING: No titles extracted from wedrowiec.zip!');
      console.log(
        '   Check if the zip file exists and has the correct structure.',
      );
    }

    // Step 3: Assign songbooks to songs
    console.log('\n=== Assigning songbooks to songs ===');

    const songs = await Song.find({ deletedAt: null });
    console.log(`Found ${songs.length} songs in database`);

    let pielgrzymCount = 0;
    let zielonyCount = 0;
    let wedrowiecCount = 0;
    let zboroweCount = 0;
    let unchangedCount = 0;

    // Track fuzzy matches for debugging (only those with similarity < 1.0)
    const fuzzyMatches: Array<{
      title: string;
      songbook: string;
      similarity: number;
    }> = [];

    // Debug: Track specific problematic songs
    const debugSongs: string[] = [
      'XI. Choćbym wszystko miał',
      'Choćbym wszystko miał',
    ];

    for (const song of songs) {
      const normalizedTitle = normalizeTitle(song.title || '');
      let newSongbook: string | null = null;
      let matchSimilarity = 0;

      // Debug specific songs
      const isDebugSong = debugSongs.some(
        (debugTitle) =>
          song.title?.toLowerCase().includes(debugTitle.toLowerCase()) ||
          normalizedTitle.includes(
            debugTitle.toLowerCase().replace(/^xi\.\s*/i, ''),
          ),
      );

      if (isDebugSong) {
        console.log(`\n=== DEBUG: "${song.title}" ===`);
        console.log(`  Normalized: "${normalizedTitle}"`);
        console.log(
          `  In pielgrzym set: ${pielgrzymNormalized.has(normalizedTitle)}`,
        );
        if (pielgrzymNormalized.has(normalizedTitle)) {
          console.log(`  ✓ Found exact match in pielgrzym!`);
        } else {
          // Check if similar title exists
          const similarTitles = Array.from(pielgrzymNormalized).filter(
            (t) => t.includes('choćbym') || t.includes('wszystko'),
          );
          if (similarTitles.length > 0) {
            console.log(
              `  Similar titles in pielgrzym: ${similarTitles.slice(0, 3).join(', ')}`,
            );
          }
        }
      }

      // First, try exact match (fastest and most reliable)
      if (pielgrzymNormalized.has(normalizedTitle)) {
        newSongbook = 'pielgrzym';
        pielgrzymCount++;
      } else if (nowegoZyciaNormalized.has(normalizedTitle)) {
        newSongbook = 'zielony';
        zielonyCount++;
      } else if (wedrowiecNormalized.has(normalizedTitle)) {
        newSongbook = 'wedrowiec';
        wedrowiecCount++;
      } else {
        // No exact match, try fuzzy matching with higher threshold (0.8) for better accuracy
        const pielgrzymMatch = findBestMatch(
          normalizedTitle,
          pielgrzymNormalized,
          0.8,
        );
        const zielonyMatch = findBestMatch(
          normalizedTitle,
          nowegoZyciaNormalized,
          0.8,
        );
        const wedrowiecMatch = findBestMatch(
          normalizedTitle,
          wedrowiecNormalized,
          0.8,
        );

        // Find the best match across all songbooks
        const matches = [
          { songbook: 'pielgrzym', similarity: pielgrzymMatch.similarity },
          { songbook: 'zielony', similarity: zielonyMatch.similarity },
          { songbook: 'wedrowiec', similarity: wedrowiecMatch.similarity },
        ];

        matches.sort((a, b) => b.similarity - a.similarity);
        const bestMatch = matches[0];

        // Assign to songbook if similarity is high enough (threshold: 0.8 for fuzzy matching)
        if (bestMatch.similarity >= 0.8) {
          newSongbook = bestMatch.songbook as
            | 'pielgrzym'
            | 'zielony'
            | 'wedrowiec';
          matchSimilarity = bestMatch.similarity;

          // Track fuzzy matches for debugging
          fuzzyMatches.push({
            title: song.title || '',
            songbook: newSongbook,
            similarity: bestMatch.similarity,
          });

          if (newSongbook === 'pielgrzym') pielgrzymCount++;
          else if (newSongbook === 'zielony') zielonyCount++;
          else if (newSongbook === 'wedrowiec') wedrowiecCount++;
        } else {
          // No good match found, assign to "zborowe"
          newSongbook = 'zborowe';
          zboroweCount++;
        }
      }

      // Update song if songbook changed
      if (song.songbook !== newSongbook) {
        await Song.updateOne({ _id: song._id }, { songbook: newSongbook });
      } else {
        unchangedCount++;
      }
    }

    // Show fuzzy matches for review
    if (fuzzyMatches.length > 0) {
      console.log(
        `\n=== Fuzzy matches (${fuzzyMatches.length} songs matched with similarity < 1.0) ===`,
      );
      const topFuzzy = fuzzyMatches
        .sort((a, b) => a.similarity - b.similarity)
        .slice(0, 10);
      for (const match of topFuzzy) {
        console.log(
          `  "${match.title}" -> ${match.songbook} (similarity: ${(match.similarity * 100).toFixed(1)}%)`,
        );
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Pielgrzym: ${pielgrzymCount} songs`);
    console.log(`Zielony (Nowego Życia): ${zielonyCount} songs`);
    console.log(`Wędrowiec: ${wedrowiecCount} songs`);
    console.log(`Zborowe: ${zboroweCount} songs`);
    console.log(`Unchanged: ${unchangedCount} songs`);
    console.log(`Total: ${songs.length} songs processed`);

    // Debug: Show some sample matches and non-matches
    console.log('\n=== Sample matches (Pielgrzym) ===');
    const samplePielgrzym = songs
      .filter((s) => pielgrzymNormalized.has(normalizeTitle(s.title || '')))
      .slice(0, 5);
    for (const s of samplePielgrzym) {
      console.log(`  - ${s.title}`);
    }

    console.log('\n=== Sample matches (Zielony) ===');
    const sampleZielony = songs
      .filter((s) => nowegoZyciaNormalized.has(normalizeTitle(s.title || '')))
      .slice(0, 5);
    for (const s of sampleZielony) {
      console.log(`  - ${s.title}`);
    }

    console.log('\n=== Sample matches (Wędrowiec) ===');
    const sampleWedrowiec = songs
      .filter((s) => wedrowiecNormalized.has(normalizeTitle(s.title || '')))
      .slice(0, 5);
    if (sampleWedrowiec.length > 0) {
      for (const s of sampleWedrowiec) {
        console.log(`  - ${s.title}`);
      }
    } else {
      console.log('  (no matches found)');

      // Debug: Try to find partial matches
      console.log('\n=== Debug: Checking for potential matches ===');
      if (wedrowiecTitles.length > 0 && songs.length > 0) {
        console.log(
          'Comparing first 5 titles from zip with first 10 songs from database:',
        );
        for (let i = 0; i < Math.min(5, wedrowiecTitles.length); i++) {
          const zipTitle = wedrowiecTitles[i];
          const zipNormalized = normalizeTitle(zipTitle);
          console.log(`\n  Zip title: "${zipTitle}"`);
          console.log(`  Normalized: "${zipNormalized}"`);

          // Check first 10 songs in database
          let foundMatch = false;
          for (let j = 0; j < Math.min(10, songs.length); j++) {
            const dbTitle = songs[j].title || '';
            const dbNormalized = normalizeTitle(dbTitle);
            if (dbNormalized === zipNormalized) {
              console.log(
                `  ✓ MATCH: "${dbTitle}" (normalized: "${dbNormalized}")`,
              );
              foundMatch = true;
              break;
            }
          }
          if (!foundMatch) {
            console.log(`  ✗ No match found in first 10 database songs`);
            // Show closest match
            const closest = songs
              .map((s) => ({
                title: s.title || '',
                normalized: normalizeTitle(s.title || ''),
                similarity: calculateSimilarity(
                  zipNormalized,
                  normalizeTitle(s.title || ''),
                ),
              }))
              .sort((a, b) => b.similarity - a.similarity)[0];
            if (closest && closest.similarity > 0.5) {
              console.log(
                `  Closest match: "${closest.title}" (similarity: ${(closest.similarity * 100).toFixed(1)}%)`,
              );
            }
          }
        }
      }
    }

    console.log('\n=== Sample Zborowe (not matched) ===');
    const sampleZborowe = songs
      .filter((s) => {
        const norm = normalizeTitle(s.title || '');
        return (
          !pielgrzymNormalized.has(norm) &&
          !nowegoZyciaNormalized.has(norm) &&
          !wedrowiecNormalized.has(norm)
        );
      })
      .slice(0, 5);
    for (const s of sampleZborowe) {
      console.log(`  - ${s.title}`);
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
