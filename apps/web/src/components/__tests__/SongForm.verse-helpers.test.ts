/**
 * Tests for verse splitting/combining helpers in SongForm
 * These ensure that visual verse editing works correctly with string storage
 */

// Helper functions extracted from SongForm for testing
function splitVersesString(
  versesString: string | undefined
): Array<{ order: number; content: string; label: string | null }> {
  if (!versesString || !versesString.trim()) {
    return [{ order: 1, content: '', label: null }];
  }

  // Split by double newlines (paragraph breaks)
  const blocks = versesString.split(/\n\n+/).filter(block => block.trim());

  if (blocks.length === 0) {
    return [{ order: 1, content: versesString.trim(), label: null }];
  }

  return blocks.map((block, index) => ({
    order: index + 1,
    content: block.trim(),
    label: null,
  }));
}

function combineVersesToString(
  verses: Array<{ order: number; content: string; label?: string | null }>
): string {
  return verses
    .sort((a, b) => a.order - b.order)
    .map(v => v.content.trim())
    .filter(content => content.length > 0)
    .join('\n\n');
}

describe('Verse Helpers', () => {
  describe('splitVersesString', () => {
    it('should split verses by double newlines', () => {
      const versesString = 'Verse 1 content\n\nVerse 2 content\n\nVerse 3 content';
      const result = splitVersesString(versesString);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ order: 1, content: 'Verse 1 content', label: null });
      expect(result[1]).toEqual({ order: 2, content: 'Verse 2 content', label: null });
      expect(result[2]).toEqual({ order: 3, content: 'Verse 3 content', label: null });
    });

    it('should handle single verse without double newlines', () => {
      const versesString = 'Single verse content';
      const result = splitVersesString(versesString);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ order: 1, content: 'Single verse content', label: null });
    });

    it('should handle empty string', () => {
      const result = splitVersesString('');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ order: 1, content: '', label: null });
    });

    it('should handle undefined', () => {
      const result = splitVersesString(undefined);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ order: 1, content: '', label: null });
    });

    it('should trim whitespace from each verse', () => {
      const versesString = '  Verse 1  \n\n  Verse 2  ';
      const result = splitVersesString(versesString);

      expect(result[0].content).toBe('Verse 1');
      expect(result[1].content).toBe('Verse 2');
    });

    it('should handle multiple consecutive newlines', () => {
      const versesString = 'Verse 1\n\n\n\nVerse 2';
      const result = splitVersesString(versesString);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Verse 1');
      expect(result[1].content).toBe('Verse 2');
    });
  });

  describe('combineVersesToString', () => {
    it('should combine verses with double newlines', () => {
      const verses = [
        { order: 1, content: 'Verse 1', label: null },
        { order: 2, content: 'Verse 2', label: null },
        { order: 3, content: 'Verse 3', label: null },
      ];

      const result = combineVersesToString(verses);

      expect(result).toBe('Verse 1\n\nVerse 2\n\nVerse 3');
    });

    it('should sort verses by order before combining', () => {
      const verses = [
        { order: 3, content: 'Verse 3', label: null },
        { order: 1, content: 'Verse 1', label: null },
        { order: 2, content: 'Verse 2', label: null },
      ];

      const result = combineVersesToString(verses);

      expect(result).toBe('Verse 1\n\nVerse 2\n\nVerse 3');
    });

    it('should filter out empty verses', () => {
      const verses = [
        { order: 1, content: 'Verse 1', label: null },
        { order: 2, content: '', label: null },
        { order: 3, content: 'Verse 3', label: null },
      ];

      const result = combineVersesToString(verses);

      expect(result).toBe('Verse 1\n\nVerse 3');
    });

    it('should trim whitespace from verses', () => {
      const verses = [
        { order: 1, content: '  Verse 1  ', label: null },
        { order: 2, content: '  Verse 2  ', label: null },
      ];

      const result = combineVersesToString(verses);

      expect(result).toBe('Verse 1\n\nVerse 2');
    });

    it('should handle single verse', () => {
      const verses = [{ order: 1, content: 'Single verse', label: null }];

      const result = combineVersesToString(verses);

      expect(result).toBe('Single verse');
    });

    it('should handle empty array', () => {
      const result = combineVersesToString([]);

      expect(result).toBe('');
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve verse order through split and combine', () => {
      const original = 'First verse\n\nSecond verse\n\nThird verse';

      const split = splitVersesString(original);
      const combined = combineVersesToString(split);

      expect(combined).toBe(original);
    });

    it('should preserve content through split and combine', () => {
      const original = 'Verse with\nmultiple lines\n\nAnother verse';

      const split = splitVersesString(original);
      const combined = combineVersesToString(split);

      expect(combined).toBe(original);
    });

    it('should handle complex verse structure', () => {
      const original =
        'Verse 1 line 1\nVerse 1 line 2\n\nVerse 2\n\nVerse 3 line 1\nVerse 3 line 2\nVerse 3 line 3';

      const split = splitVersesString(original);
      const combined = combineVersesToString(split);

      expect(combined).toBe(original);
      expect(split).toHaveLength(3);
    });
  });
});
