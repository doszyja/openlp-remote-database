/**
 * Utilities for the Live page
 */

/**
 * Generate step labels (V1, V2, C1, etc.) for each content item
 * @param type - The verse type (verse, chorus, bridge, pre-chorus, tag)
 * @param originalLabel - The original label from the verse data
 * @returns A formatted step label like "V1", "C1", "B1", etc.
 */
export function generateStepLabel(type: string | undefined, originalLabel: string | null): string {
  const verseType = type || 'verse';
  const label = originalLabel || '';

  if (label) {
    const labelLower = label.toLowerCase();
    const match = labelLower.match(/([vcbpt])(\d+)/);
    if (match) {
      const prefix = match[1].toUpperCase();
      const number = match[2];
      const displayPrefix =
        prefix === 'C'
          ? 'C'
          : prefix === 'B'
            ? 'B'
            : prefix === 'P'
              ? 'P'
              : prefix === 'T'
                ? 'T'
                : 'V';
      return `${displayPrefix}${number}`;
    }
    const numMatch = labelLower.match(/\d+/);
    if (numMatch) {
      const prefix =
        verseType === 'chorus'
          ? 'C'
          : verseType === 'bridge'
            ? 'B'
            : verseType === 'pre-chorus'
              ? 'P'
              : verseType === 'tag'
                ? 'T'
                : 'V';
      return `${prefix}${numMatch[0]}`;
    }
  }

  const prefix =
    verseType === 'chorus'
      ? 'C'
      : verseType === 'bridge'
        ? 'B'
        : verseType === 'pre-chorus'
          ? 'P'
          : verseType === 'tag'
            ? 'T'
            : 'V';
  const number = verseType === 'chorus' ? '1' : '1';
  return `${prefix}${number}`;
}
