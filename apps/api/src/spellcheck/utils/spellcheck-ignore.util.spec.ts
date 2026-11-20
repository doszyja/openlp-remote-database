import { isSpellcheckRepeatMarker } from './spellcheck-ignore.util';

describe('isSpellcheckRepeatMarker', () => {
  it.each(['x2', 'X3', 'x10', 'X99'])('returns true for %s', (value) => {
    expect(isSpellcheckRepeatMarker(value)).toBe(true);
  });

  it.each(['x', '2x', 'x2y', 'kor', ' ×2 '])('returns false for %s', (value) => {
    expect(isSpellcheckRepeatMarker(value)).toBe(false);
  });
});