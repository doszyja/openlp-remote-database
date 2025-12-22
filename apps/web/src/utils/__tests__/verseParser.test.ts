/**
 * Tests for verseParser utilities
 * Tests the normalizeVerseIdentifier function and other utilities
 */

import { normalizeVerseIdentifier, getVerseTypePrefix } from '../verseParser';

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
  };
}

describe('normalizeVerseIdentifier', () => {
  describe('PRIORITY 1: Use sourceId when available', () => {
    it('should return sourceId if it matches format v1, c1, etc.', () => {
      const result = normalizeVerseIdentifier('v1', null, 'verse', 1);
      expect(result).toBe('v1');
    });

    it('should return sourceId in lowercase if uppercase', () => {
      const result = normalizeVerseIdentifier('V1', null, 'verse', 1);
      expect(result).toBe('v1');
    });

    it('should return sourceId for chorus', () => {
      const result = normalizeVerseIdentifier('c1', null, 'chorus', 1);
      expect(result).toBe('c1');
    });

    it('should return sourceId for bridge', () => {
      const result = normalizeVerseIdentifier('b2', null, 'bridge', 2);
      expect(result).toBe('b2');
    });

    it('should return sourceId for pre-chorus', () => {
      const result = normalizeVerseIdentifier('p1', null, 'pre-chorus', 1);
      expect(result).toBe('p1');
    });

    it('should return sourceId for tag', () => {
      const result = normalizeVerseIdentifier('t1', null, 'tag', 1);
      expect(result).toBe('t1');
    });

    it('should extract number and rebuild if sourceId does not match format', () => {
      const result = normalizeVerseIdentifier('verse1', null, 'verse', 1);
      expect(result).toBe('v1');
    });

    it('should extract number from malformed sourceId', () => {
      const result = normalizeVerseIdentifier('Chorus1', null, 'chorus', 1);
      expect(result).toBe('c1');
    });

    it('should handle sourceId with spaces', () => {
      const result = normalizeVerseIdentifier('v 1', null, 'verse', 1);
      expect(result).toBe('v1');
    });
  });

  describe('PRIORITY 2: Extract from label if sourceId not available', () => {
    it('should extract from label in format v1, c1', () => {
      const result = normalizeVerseIdentifier(undefined, 'v2', 'verse', 2);
      expect(result).toBe('v2');
    });

    it('should extract from label in format c1', () => {
      const result = normalizeVerseIdentifier(undefined, 'c1', 'chorus', 1);
      expect(result).toBe('c1');
    });

    it('should extract from readable label "Verse 1"', () => {
      const result = normalizeVerseIdentifier(undefined, 'Verse 1', 'verse', 1);
      expect(result).toBe('v1');
    });

    it('should extract from readable label "Chorus 1"', () => {
      const result = normalizeVerseIdentifier(undefined, 'Chorus 1', 'chorus', 1);
      expect(result).toBe('c1');
    });

    it('should extract from readable label "Bridge 2"', () => {
      const result = normalizeVerseIdentifier(undefined, 'Bridge 2', 'bridge', 2);
      expect(result).toBe('b2');
    });

    it('should extract from readable label "Pre-Chorus 1"', () => {
      const result = normalizeVerseIdentifier(undefined, 'Pre-Chorus 1', 'pre-chorus', 1);
      expect(result).toBe('p1');
    });

    it('should extract from readable label "Tag 1"', () => {
      const result = normalizeVerseIdentifier(undefined, 'Tag 1', 'tag', 1);
      expect(result).toBe('t1');
    });

    it('should handle label in lowercase', () => {
      const result = normalizeVerseIdentifier(undefined, 'verse 3', 'verse', 3);
      expect(result).toBe('v3');
    });

    it('should handle label with prefix matching type', () => {
      const result = normalizeVerseIdentifier(undefined, 'v5', 'verse', 5);
      expect(result).toBe('v5');
    });

    it('should extract number from label even if prefix does not match type', () => {
      // If label is "c1" but type is "verse", it should still extract "1" and use verse prefix
      const result = normalizeVerseIdentifier(undefined, 'c1', 'verse', 1);
      // Should extract number "1" and use verse prefix "v"
      expect(result).toBe('v1');
    });
  });

  describe('PRIORITY 3: Generate from type and order', () => {
    it('should generate v1 from verse type and order 1', () => {
      const result = normalizeVerseIdentifier(undefined, null, 'verse', 1);
      expect(result).toBe('v1');
    });

    it('should generate c1 from chorus type and order 1', () => {
      const result = normalizeVerseIdentifier(undefined, null, 'chorus', 1);
      expect(result).toBe('c1');
    });

    it('should generate b2 from bridge type and order 2', () => {
      const result = normalizeVerseIdentifier(undefined, null, 'bridge', 2);
      expect(result).toBe('b2');
    });

    it('should generate p1 from pre-chorus type and order 1', () => {
      const result = normalizeVerseIdentifier(undefined, null, 'pre-chorus', 1);
      expect(result).toBe('p1');
    });

    it('should generate t1 from tag type and order 1', () => {
      const result = normalizeVerseIdentifier(undefined, null, 'tag', 1);
      expect(result).toBe('t1');
    });

    it('should handle undefined type as verse', () => {
      const result = normalizeVerseIdentifier(undefined, null, undefined, 3);
      expect(result).toBe('v3');
    });

    it('should handle order 0', () => {
      const result = normalizeVerseIdentifier(undefined, null, 'verse', 0);
      expect(result).toBe('v0');
    });

    it('should handle large order numbers', () => {
      const result = normalizeVerseIdentifier(undefined, null, 'verse', 99);
      expect(result).toBe('v99');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string sourceId', () => {
      const result = normalizeVerseIdentifier('', 'Verse 1', 'verse', 1);
      // Empty string should fall through to label
      expect(result).toBe('v1');
    });

    it('should handle empty string label', () => {
      const result = normalizeVerseIdentifier(undefined, '', 'verse', 1);
      // Empty string should fall through to type and order
      expect(result).toBe('v1');
    });

    it('should prioritize sourceId over label', () => {
      const result = normalizeVerseIdentifier('v5', 'Verse 1', 'verse', 1);
      expect(result).toBe('v5');
    });

    it('should prioritize label over type and order', () => {
      const result = normalizeVerseIdentifier(undefined, 'Verse 3', 'verse', 1);
      expect(result).toBe('v3');
    });

    it('should handle label without number', () => {
      const result = normalizeVerseIdentifier(undefined, 'Chorus', 'chorus', 2);
      // Should fall through to type and order
      expect(result).toBe('c2');
    });

    it('should handle sourceId with invalid format but extract number', () => {
      const result = normalizeVerseIdentifier('invalid123', null, 'verse', 1);
      expect(result).toBe('v123');
    });

    it('should handle label with multiple numbers (use first)', () => {
      const result = normalizeVerseIdentifier(undefined, 'Verse 1 and 2', 'verse', 1);
      expect(result).toBe('v1');
    });

    it('should handle mixed case in sourceId', () => {
      const result = normalizeVerseIdentifier('C1', null, 'chorus', 1);
      expect(result).toBe('c1');
    });

    it('should handle mixed case in label', () => {
      const result = normalizeVerseIdentifier(undefined, 'VERSE 1', 'verse', 1);
      expect(result).toBe('v1');
    });
  });
});

describe('getVerseTypePrefix', () => {
  it('should return "v" for verse type', () => {
    expect(getVerseTypePrefix('verse')).toBe('v');
  });

  it('should return "c" for chorus type', () => {
    expect(getVerseTypePrefix('chorus')).toBe('c');
  });

  it('should return "b" for bridge type', () => {
    expect(getVerseTypePrefix('bridge')).toBe('b');
  });

  it('should return "p" for pre-chorus type', () => {
    expect(getVerseTypePrefix('pre-chorus')).toBe('p');
  });

  it('should return "t" for tag type', () => {
    expect(getVerseTypePrefix('tag')).toBe('t');
  });

  it('should return "v" for undefined type', () => {
    expect(getVerseTypePrefix(undefined)).toBe('v');
  });
});
