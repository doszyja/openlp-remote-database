/** OpenLP / śpiewnik: „x2”, „x3” — liczba powtórzeń zwrotki/refrenu. */
const REPEAT_MARKER_RE = /^x\d+$/i;

export function isSpellcheckRepeatMarker(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return REPEAT_MARKER_RE.test(trimmed);
}