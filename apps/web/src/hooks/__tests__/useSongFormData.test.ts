/**
 * Tests for useSongFormData hook and helper functions
 * These ensure that song form data preparation works correctly
 */

import type { SongResponseDto } from '@openlp/shared';
import {
  prepareSongFormData,
  generateSourceId,
  convertVersesArrayToFormData,
  extractUniqueSourceVerses,
  extractVersesString,
} from '../useSongFormData';
import type { VerseFormData } from '../useSongFormData';

// Simple test framework for environments without vitest
function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}:`, error);
    throw error;
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toHaveLength(expected: number) {
      if (Array.isArray(actual) && actual.length !== expected) {
        throw new Error(`Expected array to have length ${expected}, got ${actual.length}`);
      }
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected ${actual} to be truthy`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected ${actual} to be null`);
      }
    },
    toMatch(pattern: RegExp | string) {
      const str = String(actual);
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      if (!regex.test(str)) {
        throw new Error(`Expected ${str} to match ${pattern}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    not: {
      toContain(substring: string) {
        const str = String(actual);
        if (str.includes(substring)) {
          throw new Error(`Expected ${str} not to contain ${substring}`);
        }
      },
    },
  };
}

describe('useSongFormData', () => {
  describe('extractVersesString', () => {
    it('should extract string from song.verses when it is a string', () => {
      const song = {
        id: '1',
        title: 'Test Song',
        verses: 'Verse 1\n\nVerse 2',
        number: null,
        language: 'pl',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tags: [],
      } as unknown as SongResponseDto;

      const result = extractVersesString(song);
      expect(result).toBe('Verse 1\n\nVerse 2');
    });

    it('should extract content from first item when verses is an array', () => {
      const song = {
        id: '1',
        title: 'Test Song',
        verses: [{ order: 1, content: 'Verse 1\n\nVerse 2', label: null }],
        number: null,
        language: 'pl',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tags: [],
      } as unknown as SongResponseDto;

      const result = extractVersesString(song);
      expect(result).toBe('Verse 1\n\nVerse 2');
    });

    it('should return null when verses is empty array', () => {
      const song = {
        id: '1',
        title: 'Test Song',
        verses: [],
        number: null,
        language: 'pl',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tags: [],
      } as unknown as SongResponseDto;

      const result = extractVersesString(song);
      expect(result).toBeNull();
    });
  });

  describe('generateSourceId', () => {
    it('should use originalLabel when available', () => {
      const result = generateSourceId('v1', null, 'verse', 1);
      expect(result).toBe('v1');
    });

    it('should extract from label when it matches format', () => {
      const result = generateSourceId(undefined, 'c1', 'chorus', 1);
      expect(result).toBe('c1');
    });

    it('should extract number from readable label format', () => {
      const result = generateSourceId(undefined, 'Verse 1', 'verse', 1);
      expect(result).toBe('v1');
    });

    it('should generate from type and order when no label', () => {
      const result = generateSourceId(undefined, null, 'verse', 2);
      expect(result).toBe('v2');
    });

    it('should always return short format, never readable format', () => {
      const result1 = generateSourceId(undefined, 'Chorus 1', 'chorus', 1);
      expect(result1).toBe('c1');
      expect(result1).not.toContain('Chorus');

      const result2 = generateSourceId(undefined, 'Verse 2', 'verse', 2);
      expect(result2).toBe('v2');
      expect(result2).not.toContain('Verse');
    });
  });

  describe('convertVersesArrayToFormData', () => {
    it('should convert versesArray with originalLabel to form data', () => {
      const versesArray = [
        { order: 1, content: 'Verse 1', label: 'Verse 1', originalLabel: 'v1' },
        { order: 2, content: 'Chorus', label: 'Chorus', originalLabel: 'c1' },
      ];

      const result = convertVersesArrayToFormData(versesArray);
      expect(result).toHaveLength(2);
      expect(result[0].sourceId).toBe('v1');
      expect(result[1].sourceId).toBe('c1');
    });

    it('should generate sourceId from label when originalLabel is missing', () => {
      const versesArray = [
        { order: 1, content: 'Verse 1', label: 'v1' },
        { order: 2, content: 'Chorus', label: 'c1' },
      ];

      const result = convertVersesArrayToFormData(versesArray);
      expect(result[0].sourceId).toBe('v1');
      expect(result[1].sourceId).toBe('c1');
    });

    it('should extract from readable label format', () => {
      const versesArray = [
        { order: 1, content: 'Verse 1', label: 'Verse 1' },
        { order: 2, content: 'Chorus', label: 'Chorus 1' },
      ];

      const result = convertVersesArrayToFormData(versesArray);
      expect(result[0].sourceId).toBe('v1');
      expect(result[1].sourceId).toBe('c1');
    });
  });

  describe('extractUniqueSourceVerses', () => {
    it('should deduplicate verses by originalLabel', () => {
      const parsedVerses = [
        { order: 1, content: 'Verse 1', label: 'v1', type: 'verse' as const, originalLabel: 'v1' },
        { order: 2, content: 'Chorus', label: 'c1', type: 'chorus' as const, originalLabel: 'c1' },
        { order: 3, content: 'Verse 2', label: 'v2', type: 'verse' as const, originalLabel: 'v2' },
        { order: 4, content: 'Chorus', label: 'c1', type: 'chorus' as const, originalLabel: 'c1' }, // Duplicate
      ];

      const result = extractUniqueSourceVerses(parsedVerses);
      expect(result).toHaveLength(3);
      expect(result.map(v => v.sourceId)).toEqual(['v1', 'c1', 'v2']);
    });

    it('should keep verse with more content when duplicates exist', () => {
      const parsedVerses = [
        { order: 1, content: 'Short', label: 'c1', type: 'chorus' as const, originalLabel: 'c1' },
        {
          order: 4,
          content: 'Longer chorus content',
          label: 'c1',
          type: 'chorus' as const,
          originalLabel: 'c1',
        },
      ];

      const result = extractUniqueSourceVerses(parsedVerses);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Longer chorus content');
    });

    it('should handle verses without originalLabel', () => {
      const parsedVerses = [
        { order: 1, content: 'Verse 1', label: 'v1', type: 'verse' as const },
        { order: 2, content: 'Verse 2', label: null, type: 'verse' as const },
      ];

      const result = extractUniqueSourceVerses(parsedVerses);
      expect(result).toHaveLength(2);
      expect(result[0].sourceId).toBe('v1');
      expect(result[1].sourceId).toBe('v2'); // Generated from order
    });
  });

  describe('prepareSongFormData', () => {
    it('should use versesArray when available', () => {
      const song = {
        id: '1',
        title: 'Test Song',
        verses: 'Verse 1',
        versesArray: [
          { order: 1, content: 'Verse 1', label: 'v1', originalLabel: 'v1' },
          { order: 2, content: 'Chorus', label: 'c1', originalLabel: 'c1' },
        ],
        verseOrder: 'v1 c1',
        number: null,
        language: 'pl',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tags: [],
      } as unknown as SongResponseDto;

      const result = prepareSongFormData(song);
      expect(result.sourceVerses).toHaveLength(2);
      expect(result.sourceVerses[0].sourceId).toBe('v1');
      expect(result.sourceVerses[1].sourceId).toBe('c1');
      expect(result.verseOrder).toBe('v1 c1');
    });

    it('should parse from verses string when versesArray is not available', () => {
      const song = {
        id: '1',
        title: 'Test Song',
        verses: 'Verse 1\n\nVerse 2',
        verseOrder: 'v1 v2',
        number: null,
        language: 'pl',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tags: [],
      } as unknown as SongResponseDto;

      const result = prepareSongFormData(song);
      expect(result.sourceVerses.length).toBeGreaterThan(0);
      expect(result.verseOrder).toBe('v1 v2');
    });

    it('should generate verseOrder when not provided', () => {
      const song = {
        id: '1',
        title: 'Test Song',
        versesArray: [
          { order: 1, content: 'Verse 1', label: 'v1', originalLabel: 'v1' },
          { order: 2, content: 'Chorus', label: 'c1', originalLabel: 'c1' },
        ],
        number: null,
        language: 'pl',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tags: [],
      } as unknown as SongResponseDto;

      const result = prepareSongFormData(song);
      expect(result.verseOrder).toBeTruthy();
      expect(result.verseOrder).toMatch(/v1|c1/);
    });

    it('should handle empty verses', () => {
      const song = {
        id: '1',
        title: 'Test Song',
        verses: '',
        number: null,
        language: 'pl',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tags: [],
      } as unknown as SongResponseDto;

      const result = prepareSongFormData(song);
      expect(result.sourceVerses).toHaveLength(1);
      expect(result.sourceVerses[0].content).toBe('');
    });
  });
});
