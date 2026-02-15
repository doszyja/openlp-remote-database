/**
 * Normalize a single verse-order token from readable format to short format.
 * Examples: "verse 1" -> "v1", "chorus 1" -> "c1", "v1" -> "v1"
 */
function normalizeVerseOrderToken(token: string): string {
  const t = token.trim();
  if (!t) return '';

  const lower = t.toLowerCase();
  // Already short format (v1, c1, b1, p1, t1)
  if (/^[vcbpt]\d+$/.test(lower)) return lower;

  // Readable formats -> short format
  const verseMatch = lower.match(/^verse\s*(\d+)$/);
  if (verseMatch) return `v${verseMatch[1]}`;

  const chorusMatch = lower.match(/^chorus\s*(\d*)$/);
  if (chorusMatch) return `c${chorusMatch[1] || '1'}`;

  const bridgeMatch = lower.match(/^bridge\s*(\d+)$/);
  if (bridgeMatch) return `b${bridgeMatch[1]}`;

  const preChorusMatch = lower.match(/^pre-?chorus\s*(\d*)$/);
  if (preChorusMatch) return `p${preChorusMatch[1] || '1'}`;

  const tagMatch = lower.match(/^tag\s*(\d*)$/);
  if (tagMatch) return `t${tagMatch[1] || '1'}`;

  // Unknown token - return as-is (e.g. already "v1" with different casing)
  return lower;
}

/**
 * Build default verse order string from verses array (e.g. "v1 v2 v3" or "v1 c1 v2").
 * Uses originalLabel when present; else infers from label (Verse 1, Chorus, Bridge, etc.); else "v" + order.
 */
export function defaultVerseOrderFromVerses(
  verses: Array<{ order: number; originalLabel?: string | null; label?: string | null }>
): string {
  if (!verses?.length) return '';
  const sorted = [...verses].sort((a, b) => a.order - b.order);
  return sorted
    .map(v => {
      const orig = v.originalLabel?.trim();
      if (orig && /^[vcbpt]\d+$/i.test(orig)) return orig.toLowerCase();
      const readable = v.label?.trim();
      if (readable) {
        const normalized = normalizeVerseOrderToken(readable);
        if (normalized) return normalized;
      }
      return `v${v.order}`;
    })
    .join(' ');
}

/**
 * Normalize verse_order string from readable format to short format.
 * e.g. "verse 1 verse 2 chorus 1" -> "v1 v2 c1"
 * Already correct strings like "v1 c1 v2" are returned unchanged.
 */
export function normalizeVerseOrderString(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const normalized = trimmed.split(/\s+/).map(normalizeVerseOrderToken).filter(Boolean).join(' ');
  return normalized;
}
