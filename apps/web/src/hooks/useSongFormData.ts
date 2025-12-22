import { useEffect, useRef } from 'react';
import type { UseFormReset, UseFormSetValue } from 'react-hook-form';
import type { SongResponseDto } from '@openlp/shared';
import {
  parseVerses,
  generateVerseOrderString,
  getVerseTypePrefix,
} from '../utils/verseParser';

/**
 * Verse type for form data
 */
export type VerseFormType = 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'tag';

/**
 * Verse form data structure
 */
export interface VerseFormData {
  order: number;
  content: string;
  label?: string | null;
  type?: VerseFormType;
  sourceId?: string; // Unique ID for source verse (for repetition support)
}

/**
 * Song form data structure
 */
export interface SongFormData {
  title: string;
  sourceVerses: VerseFormData[];
  verseOrder: string;
}

/**
 * Parse verse label to determine type
 */
function parseVerseType(label: string): VerseFormType {
  const normalized = label.toLowerCase();
  if (normalized.startsWith('c')) return 'chorus';
  if (normalized.startsWith('b')) return 'bridge';
  if (normalized.startsWith('p')) return 'pre-chorus';
  if (normalized.startsWith('t')) return 'tag';
  return 'verse';
}

/**
 * Generate sourceId from verse data
 * Always returns short format (v1, c1) not readable format (Verse 1, Chorus 1)
 */
export function generateSourceId(
  originalLabel: string | undefined,
  label: string | null | undefined,
  type: VerseFormType,
  order: number
): string {
  // PRIORITY 1: Use originalLabel if available (e.g., "v1", "c1") - this is the source of truth
  if (originalLabel) {
    return originalLabel.toLowerCase();
  }

  // PRIORITY 2: Extract from label if it matches format (e.g., "v1", "c1")
  if (label) {
    const labelLower = label.toLowerCase();
    const prefix = getVerseTypePrefix(type);
    // Check if label starts with prefix (e.g., "c1", "v2")
    if (labelLower.startsWith(prefix)) {
      return labelLower;
    }
    // Extract number from label if available (e.g., "Verse 1" -> "1")
    const numMatch = labelLower.match(/\d+/);
    if (numMatch) {
      return `${prefix}${numMatch[0]}`;
    }
  }

  // PRIORITY 3: Generate from type and order
  return `${getVerseTypePrefix(type)}${order}`;
}

/**
 * Convert versesArray from API to VerseFormData
 * Uses originalLabel as source of truth for sourceId
 */
export function convertVersesArrayToFormData(
  versesArray: Array<{
    order: number;
    content: string;
    label?: string;
    originalLabel?: string;
  }>
): VerseFormData[] {
  return versesArray.map(v => {
    const verseType = parseVerseType(v.originalLabel || v.label || 'verse');
    const sourceId = generateSourceId(v.originalLabel, v.label, verseType, v.order);

    return {
      order: v.order,
      content: v.content,
      label: v.label ?? null,
      type: verseType,
      sourceId, // Always use short format (v1, c1) not readable (Verse 1, Chorus 1)
    };
  });
}

/**
 * Extract unique source verses from parsed verses
 * Deduplicates by originalLabel/type to handle verseOrder duplicates (e.g., "v1 c1 v2 c1")
 */
export function extractUniqueSourceVerses(
  parsedVerses: Array<{
    order: number;
    content: string;
    label: string | null;
    type?: VerseFormType;
    originalLabel?: string;
  }>
): VerseFormData[] {
  const sourceVersesMap = new Map<string, VerseFormData>();

  parsedVerses.forEach(v => {
    const verseType = (v.type ?? 'verse') as VerseFormType;
    const sourceId = generateSourceId(v.originalLabel, v.label, verseType, v.order);
    const key = sourceId.toLowerCase();

    if (!sourceVersesMap.has(key)) {
      sourceVersesMap.set(key, {
        order: v.order,
        content: v.content,
        label: v.label ?? null,
        type: verseType,
        sourceId,
      });
    } else {
      // If verse with same key exists, update content if current has more content
      const existing = sourceVersesMap.get(key)!;
      if (v.content.trim().length > existing.content.trim().length) {
        existing.content = v.content;
      }
    }
  });

  return Array.from(sourceVersesMap.values());
}

/**
 * Extract verses string from song data
 * Handles both string and array formats from API
 */
export function extractVersesString(song: SongResponseDto): string | null {
  if (typeof song.verses === 'string') {
    return song.verses;
  }

  if (Array.isArray(song.verses)) {
    // Extract content from array format (legacy API response)
    if (song.verses.length > 0) {
      const firstItem = song.verses[0];
      if (firstItem && typeof firstItem === 'object' && 'content' in firstItem) {
        return firstItem.content as string;
      }
    }
  }

  return null;
}

/**
 * Prepare form data from song
 * Returns unique sourceVerses and verseOrder string
 */
export function prepareSongFormData(song: SongResponseDto): {
  sourceVerses: VerseFormData[];
  verseOrder: string;
} {
  const versesToParse = extractVersesString(song);

  // PRIORITY: If versesArray from API is available, use it directly (has originalLabel, no duplicates)
  let uniqueSourceVerses: VerseFormData[];
  if (song.versesArray && Array.isArray(song.versesArray) && song.versesArray.length > 0) {
    uniqueSourceVerses = convertVersesArrayToFormData(song.versesArray);
  } else {
    // Parse from verses string/XML (may contain duplicates from verseOrder)
    const parsedVerses =
      versesToParse && versesToParse.trim()
        ? parseVerses(
            versesToParse,
            null, // Don't apply verseOrder here - we want unique source verses
            song.lyricsXml || null,
            null // Don't use versesArray here as we're in the else branch
          )
        : [{ order: 1, content: '', label: null, type: 'verse' as const }];

    uniqueSourceVerses = extractUniqueSourceVerses(parsedVerses);
  }

  // Parse verses with verseOrder for display order (used for generating verseOrder string)
  const parsedVerses =
    versesToParse && versesToParse.trim()
      ? parseVerses(
          versesToParse,
          song.verseOrder || null,
          song.lyricsXml || null,
          song.versesArray || null
        )
      : [{ order: 1, content: '', label: null, type: 'verse' as const }];

  // Use verseOrder from song if available, otherwise generate from parsed verses
  const verseOrder =
    song.verseOrder && song.verseOrder.trim()
      ? song.verseOrder.trim()
      : generateVerseOrderString(parsedVerses);

  return {
    sourceVerses: uniqueSourceVerses,
    verseOrder,
  };
}

/**
 * Hook to manage song form data initialization and updates
 */
export function useSongFormData(
  song: SongResponseDto | undefined,
  reset: UseFormReset<SongFormData>,
  sourceVerses: VerseFormData[],
  verseOrder: string,
  setValue: UseFormSetValue<SongFormData>
) {
  // Initialize form when song loads
  useEffect(() => {
    if (song) {
      const { sourceVerses: uniqueSourceVerses, verseOrder: orderString } =
        prepareSongFormData(song);

      console.log('Loading song:', {
        uniqueSourceVerses: uniqueSourceVerses.length,
        verseOrderFromSong: song.verseOrder,
        orderString,
      });

      reset({
        title: song.title || '',
        sourceVerses: uniqueSourceVerses,
        verseOrder: orderString,
      });
    }
  }, [song, reset]);

  // Update verse order string when source verses change (if order string is empty)
  // NOTE: This should NOT run when user is actively editing the field
  const prevSourceVersesRef = useRef(sourceVerses);
  useEffect(() => {
    // Only update if sourceVerses actually changed (not just on mount)
    const sourceVersesChanged =
      prevSourceVersesRef.current.length !== sourceVerses.length ||
      prevSourceVersesRef.current.some(
        (v, i) => v.sourceId !== sourceVerses[i]?.sourceId || v.content !== sourceVerses[i]?.content
      );

    if (sourceVersesChanged) {
      prevSourceVersesRef.current = sourceVerses;

      // Only auto-generate if verseOrder is completely empty (user hasn't started editing)
      if (!verseOrder || verseOrder.trim() === '') {
        const orderString = generateVerseOrderString(
          sourceVerses.map(v => ({
            order: v.order,
            content: v.content,
            label: v.label ?? null,
            type: v.type ?? 'verse',
            originalLabel: v.sourceId || undefined, // Use sourceId as originalLabel (e.g., "v1", "c1")
          }))
        );
        setValue('verseOrder', orderString);
      }
    }
  }, [sourceVerses, verseOrder, setValue]);
}

