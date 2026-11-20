import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type {
  SpellcheckIssue,
  SpellcheckReportResponse,
} from '@openlp/shared';
import { Song, SongDocument } from '../schemas/song.schema';
import { QuerySpellcheckReportDto } from './dto/query-spellcheck-report.dto';
import {
  checkTextWithLanguageTool,
  defaultSpellcheckDelayMs,
  resolveLanguageToolCode,
} from './utils/languagetool.util';
import { isSpellcheckRepeatMarker } from './utils/spellcheck-ignore.util';
import { stripOpenLpTextForSpellcheck } from './utils/strip-openlp-text.util';

interface VerseSpan {
  verseOrder: number;
  verseLabel?: string;
  start: number;
  end: number;
  plain: string;
}

function buildVerseSpans(
  verses: Array<{ order: number; content: string; label?: string }>,
): { fullText: string; spans: VerseSpan[] } {
  const spans: VerseSpan[] = [];
  let fullText = '';

  for (const verse of verses) {
    const plain = stripOpenLpTextForSpellcheck(verse.content);
    if (!plain) continue;
    const start = fullText.length;
    fullText += plain;
    const end = fullText.length;
    spans.push({
      verseOrder: verse.order,
      verseLabel: verse.label,
      start,
      end,
      plain,
    });
    fullText += '\n';
  }

  return { fullText: fullText.trimEnd(), spans };
}

function locateVerse(
  spans: VerseSpan[],
  absoluteOffset: number,
): VerseSpan | undefined {
  return spans.find(
    (span) => absoluteOffset >= span.start && absoluteOffset < span.end,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class SpellcheckService {
  private readonly logger = new Logger(SpellcheckService.name);
  private readonly ltDelayMs = defaultSpellcheckDelayMs();

  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<SongDocument>,
  ) {}

  async scanBatch(
    query: QuerySpellcheckReportDto,
  ): Promise<SpellcheckReportResponse> {
    const batchSize = query.batchSize ?? 25;
    const ltLanguage =
      query.language?.trim() ||
      resolveLanguageToolCode(process.env.SPELLCHECK_DEFAULT_LANGUAGE);

    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.songbook) {
      filter.songbook = query.songbook;
    }

    const totalSongs = await this.songModel.countDocuments(filter);

    if (query.cursor) {
      filter._id = { $gt: new Types.ObjectId(query.cursor) };
    }

    const songs = await this.songModel
      .find(filter)
      .sort({ _id: 1 })
      .limit(batchSize)
      .select({
        title: 1,
        number: 1,
        language: 1,
        songbook: 1,
        verses: 1,
      })
      .lean()
      .exec();
    const issues: SpellcheckIssue[] = [];

    for (const song of songs) {
      const { fullText, spans } = buildVerseSpans(song.verses ?? []);
      if (!fullText || fullText.length < 3) {
        await sleep(this.ltDelayMs);
        continue;
      }

      const langForSong =
        query.language?.trim() || resolveLanguageToolCode(song.language);

      try {
        const matches = await checkTextWithLanguageTool(
          fullText,
          langForSong,
        );

        for (const match of matches) {
          const span = locateVerse(spans, match.offset);
          if (!span) continue;

          const word = span.plain.slice(
            match.offset - span.start,
            match.offset - span.start + match.length,
          );
          if (!word || word.length < 2) continue;
          if (isSpellcheckRepeatMarker(word)) continue;

          const suggestions = match.replacements
            .slice(0, 5)
            .map((r) => r.value)
            .filter(Boolean);
          if (suggestions.length === 0) continue;

          issues.push({
            songId: String(song._id),
            songTitle: song.title,
            songNumber: song.number,
            songbook: song.songbook,
            verseOrder: span.verseOrder,
            verseLabel: span.verseLabel,
            offsetInVerse: match.offset - span.start,
            length: match.length,
            word,
            message: match.message,
            suggestions,
            ruleId: match.rule?.id ?? 'UNKNOWN',
          });
        }
      } catch (err) {
        this.logger.warn(
          `LanguageTool failed for song ${song._id}: ${err instanceof Error ? err.message : err}`,
        );
      }

      await sleep(this.ltDelayMs);
    }

    const last = songs[songs.length - 1];
    const nextCursor =
      songs.length === batchSize && last ? String(last._id) : null;
    const priorScanned = query.totalScanned ?? 0;
    const scannedInBatch = songs.length;

    return {
      issues,
      nextCursor,
      meta: {
        scannedInBatch,
        issuesInBatch: issues.length,
        totalSongs,
        totalScanned: priorScanned + scannedInBatch,
        provider: 'languagetool-self-hosted',
        language: ltLanguage,
      },
    };
  }
}