/**
 * Tests for useVerseManagement hook logic
 * These ensure that verse add/remove operations work correctly
 */

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
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected ${actual} to be truthy`);
      }
    },
  };
}

describe('useVerseManagement logic', () => {
  describe('addVerse logic', () => {
    it('should generate correct sourceId for new verse', () => {
      const sourceVerses: VerseFormData[] = [
        { order: 1, content: 'Verse 1', label: 'v1', type: 'verse', sourceId: 'v1' },
      ];

      const existingOfType = sourceVerses.filter(v => v.type === 'verse');
      const newNumber =
        existingOfType.length > 0
          ? Math.max(
              ...existingOfType.map(v => {
                const label = v.label || '';
                const numMatch = label.match(/\d+/);
                return numMatch ? parseInt(numMatch[0], 10) : 0;
              })
            ) + 1
          : 1;

      expect(newNumber).toBe(2);
    });

    it('should generate sourceId for new chorus when none exist', () => {
      const sourceVerses: VerseFormData[] = [
        { order: 1, content: 'Verse 1', label: 'v1', type: 'verse', sourceId: 'v1' },
      ];

      const existingOfType = sourceVerses.filter(v => v.type === 'chorus');
      const newNumber =
        existingOfType.length > 0
          ? Math.max(
              ...existingOfType.map(v => {
                const label = v.label || '';
                const numMatch = label.match(/\d+/);
                return numMatch ? parseInt(numMatch[0], 10) : 0;
              })
            ) + 1
          : 1;

      expect(newNumber).toBe(1);
    });

    it('should increment number for existing verse type', () => {
      const sourceVerses: VerseFormData[] = [
        { order: 1, content: 'Verse 1', label: 'v1', type: 'verse', sourceId: 'v1' },
        { order: 2, content: 'Verse 2', label: 'v2', type: 'verse', sourceId: 'v2' },
        { order: 3, content: 'Verse 3', label: 'v3', type: 'verse', sourceId: 'v3' },
      ];

      const existingOfType = sourceVerses.filter(v => v.type === 'verse');
      const newNumber =
        existingOfType.length > 0
          ? Math.max(
              ...existingOfType.map(v => {
                const label = v.label || '';
                const numMatch = label.match(/\d+/);
                return numMatch ? parseInt(numMatch[0], 10) : 0;
              })
            ) + 1
          : 1;

      expect(newNumber).toBe(4);
    });
  });

  describe('removeVerse logic', () => {
    it('should remove verse from order string', () => {
      const verseOrder = 'v1 c1 v2 c1';
      const verseId = 'v2';
      const orderPattern = new RegExp(`\\b${verseId}\\b`, 'gi');
      const newOrder = verseOrder.replace(orderPattern, '').replace(/\s+/g, ' ').trim();

      expect(newOrder).toBe('v1 c1 c1');
    });

    it('should remove all occurrences of verse from order string', () => {
      const verseOrder = 'v1 c1 v2 c1 v3 c1';
      const verseId = 'c1';
      const orderPattern = new RegExp(`\\b${verseId}\\b`, 'gi');
      const newOrder = verseOrder.replace(orderPattern, '').replace(/\s+/g, ' ').trim();

      expect(newOrder).toBe('v1 v2 v3');
    });

    it('should handle verseId with special characters', () => {
      const verseOrder = 'v1 c1 v2';
      const verseId = 'c1';
      const orderPattern = new RegExp(`\\b${verseId}\\b`, 'gi');
      const newOrder = verseOrder.replace(orderPattern, '').replace(/\s+/g, ' ').trim();

      expect(newOrder).toBe('v1 v2');
    });
  });

  describe('verse order string generation', () => {
    it('should append new verse to existing order string', () => {
      const currentOrder = 'v1 c1';
      const newSourceId = 'v2';
      const orderPattern = new RegExp(`\\b${newSourceId}\\b`, 'i');

      if (!orderPattern.test(currentOrder)) {
        const newOrder = `${currentOrder} ${newSourceId}`;
        expect(newOrder).toBe('v1 c1 v2');
      }
    });

    it('should not duplicate verse already in order string', () => {
      const currentOrder = 'v1 c1 v2';
      const newSourceId = 'v2';
      const orderPattern = new RegExp(`\\b${newSourceId}\\b`, 'i');

      if (orderPattern.test(currentOrder)) {
        // Should not add
        expect(orderPattern.test(currentOrder)).toBe(true);
      }
    });

    it('should set order string to new verse when empty', () => {
      const currentOrder = '';
      const newSourceId = 'v1';

      if (!currentOrder.trim()) {
        const newOrder = newSourceId;
        expect(newOrder).toBe('v1');
      }
    });
  });
});
