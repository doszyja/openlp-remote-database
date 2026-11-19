import { describe, expect, it } from 'vitest';
import { computeWordDiff, formatVersesBlock } from './songVersionDiffUi';

describe('formatVersesBlock', () => {
  it('returns placeholder for empty input', () => {
    expect(formatVersesBlock(null)).toBe('(brak zwrotek)');
    expect(formatVersesBlock([])).toBe('(brak zwrotek)');
  });

  it('sorts verses by order and includes labels', () => {
    const text = formatVersesBlock([
      { order: 2, content: 'Second', label: 'Refren' },
      { order: 1, content: 'First', originalLabel: 'Zwrotka 1' },
    ]);

    expect(text).toBe('Zwrotka 1\nFirst\n\nRefren\nSecond');
  });
});

describe('computeWordDiff', () => {
  it('marks only changed words', () => {
    const ops = computeWordDiff('Śpiewaj Panu nową pieśń', 'Śpiewaj Panu nową pieśń!');
    expect(ops.some(o => o.type === 'equal' && o.value.includes('Śpiewaj'))).toBe(true);
    expect(ops.some(o => o.type === 'insert' && o.value.includes('!'))).toBe(true);
  });

  it('handles replacement', () => {
    const ops = computeWordDiff('alfa beta', 'alfa gamma');
    expect(ops.filter(o => o.type === 'delete').map(o => o.value).join('')).toContain('beta');
    expect(ops.filter(o => o.type === 'insert').map(o => o.value).join('')).toContain('gamma');
  });
});
