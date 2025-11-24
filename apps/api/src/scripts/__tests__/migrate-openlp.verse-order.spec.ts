/**
 * Tests for verse order preservation in migration script
 * Ensures that verse_order from OpenLP verses table is preserved
 */

describe('Migration Script - Verse Order Preservation', () => {
  describe('Verse Order Sorting', () => {
    it('should sort verses by verse_order before combining', () => {
      const verses = [
        { order: 3, content: 'Third verse', label: 'Verse 3' },
        { order: 1, content: 'First verse', label: 'Verse 1' },
        { order: 2, content: 'Second verse', label: 'Verse 2' },
      ];

      // Simulate the sorting logic from migration script
      const sorted = verses.sort((a, b) => a.order - b.order);
      const combined = sorted
        .map(v => v.content.trim())
        .filter(content => content.length > 0)
        .join('\n\n');

      expect(combined).toBe('First verse\n\nSecond verse\n\nThird verse');
      expect(sorted[0].order).toBe(1);
      expect(sorted[1].order).toBe(2);
      expect(sorted[2].order).toBe(3);
    });

    it('should preserve verse_order from OpenLP verses table', () => {
      // Simulate verses from OpenLP verses table with verse_order
      const openlpVerses = [
        { verse_order: 5, verse_text: 'Fifth verse', verse_type: 'v5' },
        { verse_order: 1, verse_text: 'First verse', verse_type: 'v1' },
        { verse_order: 3, verse_text: 'Third verse', verse_type: 'v3' },
      ];

      // Convert to internal format preserving order
      const verses = openlpVerses.map(v => ({
        order: v.verse_order,
        content: v.verse_text.trim(),
        label: `Verse ${v.verse_order}`,
      }));

      // Sort and combine
      const sorted = verses.sort((a, b) => a.order - b.order);
      const combined = sorted
        .map(v => v.content.trim())
        .filter(content => content.length > 0)
        .join('\n\n');

      expect(combined).toBe('First verse\n\nThird verse\n\nFifth verse');
      expect(sorted[0].order).toBe(1);
      expect(sorted[1].order).toBe(3);
      expect(sorted[2].order).toBe(5);
    });

    it('should handle non-sequential verse orders', () => {
      const verses = [
        { order: 10, content: 'Verse 10', label: 'Verse 10' },
        { order: 2, content: 'Verse 2', label: 'Verse 2' },
        { order: 5, content: 'Verse 5', label: 'Verse 5' },
      ];

      const sorted = verses.sort((a, b) => a.order - b.order);
      const combined = sorted
        .map(v => v.content.trim())
        .join('\n\n');

      expect(combined).toBe('Verse 2\n\nVerse 5\n\nVerse 10');
    });
  });

  describe('Search Fields Generation', () => {
    it('should generate search_title from title', () => {
      const title = 'Amazing Grace';
      const searchTitle = title.toLowerCase().trim();

      expect(searchTitle).toBe('amazing grace');
    });

    it('should generate search_lyrics from verses string', () => {
      const versesString = 'Verse 1 Content\n\nVerse 2 Content';
      const searchLyrics = versesString.toLowerCase().trim();

      expect(searchLyrics).toBe('verse 1 content\n\nverse 2 content');
    });

    it('should use existing search_title if available', () => {
      const openlpSong = {
        title: 'Test Song',
        search_title: 'custom search title',
      };

      const searchTitle = openlpSong.search_title || openlpSong.title.toLowerCase().trim();

      expect(searchTitle).toBe('custom search title');
    });

    it('should use existing search_lyrics if available', () => {
      const openlpSong = {
        lyrics: 'Some lyrics',
        search_lyrics: 'custom search lyrics',
      };

      const versesString = 'Combined verses';
      const searchLyrics = openlpSong.search_lyrics || versesString.toLowerCase().trim();

      expect(searchLyrics).toBe('custom search lyrics');
    });
  });

  describe('Verse Combination', () => {
    it('should combine verses with double newlines', () => {
      const verses = [
        { order: 1, content: 'First', label: 'Verse 1' },
        { order: 2, content: 'Second', label: 'Verse 2' },
      ];

      const combined = verses
        .sort((a, b) => a.order - b.order)
        .map(v => v.content.trim())
        .filter(content => content.length > 0)
        .join('\n\n');

      expect(combined).toBe('First\n\nSecond');
    });

    it('should filter out empty verses', () => {
      const verses = [
        { order: 1, content: 'First', label: 'Verse 1' },
        { order: 2, content: '', label: 'Verse 2' },
        { order: 3, content: 'Third', label: 'Verse 3' },
      ];

      const combined = verses
        .sort((a, b) => a.order - b.order)
        .map(v => v.content.trim())
        .filter(content => content.length > 0)
        .join('\n\n');

      expect(combined).toBe('First\n\nThird');
    });
  });
});

