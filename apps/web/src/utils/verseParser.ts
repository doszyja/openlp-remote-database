/**
 * Utilities for parsing verses from different formats
 * Handles both plain string format (with \n\n separators) and XML format (from OpenLP)
 */

export interface ParsedVerse {
  order: number; // Maps to verse_order in OpenLP SQLite - preserves sequence from XML
  content: string;
  label: string | null;
  type?: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'tag';
  originalLabel?: string; // Original identifier from XML/verse_order (e.g., "v1", "c1", "b1") - used to match verseOrder string
}

/**
 * Unescape XML entities
 */
function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Parse verse label to determine type
 */
function parseVerseType(label: string): ParsedVerse['type'] {
  const normalized = label.toLowerCase();
  if (normalized.startsWith('c')) return 'chorus';
  if (normalized.startsWith('b')) return 'bridge';
  if (normalized.startsWith('p')) return 'pre-chorus';
  if (normalized.startsWith('t')) return 'tag';
  return 'verse';
}

/**
 * Extract content from CDATA sections
 * Handles multiple CDATA sections and extracts all content
 */
function extractCDataContent(text: string): string {
  if (!text || !text.trim()) {
    return text;
  }

  // Handle CDATA sections: <![CDATA[content]]>
  // Use matchAll to get all CDATA sections
  const cdataRegex = /<!\[CDATA\[([\s\S]*?)\]\]>/gi;
  const matches = Array.from(text.matchAll(cdataRegex));

  if (matches.length > 0) {
    // If there are multiple CDATA sections, join them
    // Otherwise, return the content from the first (and usually only) CDATA section
    const extractedContent = matches.map(match => match[1]).join('\n\n');
    return extractedContent.trim();
  }

  // No CDATA found, return text as-is (may contain escaped XML entities)
  return text;
}

/**
 * Parse verses from XML format (OpenLP format)
 * Handles multiple formats:
 * - Simple: <verse label="v1">Verse 1 text</verse>
 * - With type: <verse type="v" label="1">Verse 1 text</verse>
 * - Full XML: <?xml version='1.0'?><song><lyrics><verse>...</verse></lyrics></song>
 * - With CDATA: <verse><![CDATA[content]]></verse>
 */
export function parseVersesFromXml(xmlString: string): ParsedVerse[] {
  if (!xmlString || !xmlString.trim()) {
    return [{ order: 1, content: '', label: null, type: 'verse' }];
  }

  const verses: ParsedVerse[] = [];

  // Check if it's XML format
  const trimmed = xmlString.trim();
  if (!trimmed.startsWith('<') || !trimmed.includes('verse')) {
    // Not XML, treat as plain string
    return parseVersesFromString(xmlString);
  }

  // Extract lyrics section if it's a full XML document
  let lyricsSection = trimmed;

  // If it's a full XML document with <song><lyrics>...</lyrics></song>
  // Handle both <lyrics> and <lyrics /> (self-closing)
  if (trimmed.includes('<lyrics')) {
    // Try to match <lyrics>...</lyrics> first
    let lyricsMatch = trimmed.match(/<lyrics[^>]*>([\s\S]*?)<\/lyrics>/i);
    if (lyricsMatch) {
      lyricsSection = lyricsMatch[1];
    } else {
      // If no closing tag, try to extract everything after <lyrics>
      lyricsMatch = trimmed.match(/<lyrics[^>]*>([\s\S]*)/i);
      if (lyricsMatch) {
        lyricsSection = lyricsMatch[1];
      }
    }
  }

  // Parse verse tags - handle exact SQLite format:
  // <verse type="v" label="1"><![CDATA[content]]></verse>
  // <verse type="c" label="1"><![CDATA[content]]></verse>
  // IMPORTANT: Preserve exact structure from SQLite (1:1 transparent)
  // Handle both type+label as separate attributes and label-only format
  let match: RegExpExecArray | null;
  let order = 1; // verse_order - increments based on sequence in XML

  // PRIORITY 1: Match verses with both type and label attributes (in either order)
  // This matches SQLite format: <verse type="v" label="1"> or <verse label="1" type="v">
  // Must handle CDATA in content: <![CDATA[...]]>
  const typeLabelRegex1 =
    /<verse[^>]*type=["']([^"']+)["'][^>]*label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/verse>/gi;
  const typeLabelRegex2 =
    /<verse[^>]*label=["']([^"']+)["'][^>]*type=["']([^"']+)["'][^>]*>([\s\S]*?)<\/verse>/gi;

  const matches: Array<{ fullMatch: string; type?: string; label: string; content: string }> = [];

  // Try type first, then label
  typeLabelRegex1.lastIndex = 0;
  while ((match = typeLabelRegex1.exec(lyricsSection)) !== null) {
    matches.push({
      fullMatch: match[0],
      type: match[1],
      label: match[2],
      content: match[3],
    });
  }

  // Try label first, then type (swap the captures)
  typeLabelRegex2.lastIndex = 0;
  while ((match = typeLabelRegex2.exec(lyricsSection)) !== null) {
    // Check if we already have this match (avoid duplicates)
    const alreadyMatched = matches.some(m => m.fullMatch === match![0]);
    if (!alreadyMatched) {
      matches.push({
        fullMatch: match[0],
        type: match[2], // type is in match[2] when label comes first
        label: match[1], // label is in match[1] when label comes first
        content: match[3],
      });
    }
  }

  // If no matches with both type and label, try just label
  if (matches.length === 0) {
    const verseRegex = /<verse[^>]*label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/verse>/gi;
    verseRegex.lastIndex = 0;
    while ((match = verseRegex.exec(lyricsSection)) !== null) {
      matches.push({
        fullMatch: match[0],
        label: match[1],
        content: match[2],
      });
    }
  }

  // If still no matches, try a more general pattern (verse tag without required attributes)
  if (matches.length === 0) {
    const generalVerseRegex = /<verse[^>]*>([\s\S]*?)<\/verse>/gi;
    generalVerseRegex.lastIndex = 0;
    while ((match = generalVerseRegex.exec(lyricsSection)) !== null) {
      matches.push({
        fullMatch: match[0],
        label: '',
        content: match[1],
      });
    }
  }

  // Process each match
  for (const matchData of matches) {
    let label = matchData.label || '';
    let typeAttr = matchData.type || '';
    let content = matchData.content || '';

    // If we have both type and label, combine them if label doesn't already start with type
    // Example: type="c" label="1" -> "c1"
    // Example: type="v" label="1" -> "v1"
    // Example: label="v1" (no type) -> keep "v1"
    if (typeAttr && label && !label.toLowerCase().startsWith(typeAttr.toLowerCase())) {
      label = `${typeAttr}${label}`;
    }

    // If we don't have type but have label, try to extract type from label
    // Example: label="v1" -> type="verse"
    // Example: label="c1" -> type="chorus"
    if (!typeAttr && label) {
      typeAttr = label.charAt(0).toLowerCase();
    }

    // If we still don't have type or label, try to extract from the full match
    if ((!typeAttr || !label) && matchData.fullMatch) {
      const attributesMatch = matchData.fullMatch.match(/<verse\s+([^>]+?)>/i);
      if (attributesMatch) {
        const attributes = attributesMatch[1];

        // Extract label if we don't have it
        if (!label) {
          const labelMatch = attributes.match(/label=["']([^"']+)["']/i);
          if (labelMatch) {
            label = labelMatch[1];
          }
        }

        // Extract type if we don't have it
        if (!typeAttr) {
          const typeMatch = attributes.match(/type=["']([^"']+)["']/i);
          if (typeMatch) {
            typeAttr = typeMatch[1];
            // Combine if we now have both
            if (typeAttr && label && !label.toLowerCase().startsWith(typeAttr.toLowerCase())) {
              label = `${typeAttr}${label}`;
            }
          }
        }
      }
    }

    // Extract CDATA if present
    content = extractCDataContent(content);

    // Unescape XML entities
    content = unescapeXml(content.trim());

    // Determine verse type
    let verseType: ParsedVerse['type'] = 'verse';
    if (typeAttr) {
      verseType = parseVerseType(typeAttr);
    } else if (label) {
      verseType = parseVerseType(label);
    }

    // Store original label (e.g., "v1", "c1") for verseOrder matching
    const originalLabel = label ? label.toLowerCase() : undefined;

    verses.push({
      order,
      content,
      label: label || null,
      type: verseType,
      originalLabel, // Store original identifier (e.g., "v1", "c1") for verseOrder matching
    });
    order++;
  }

  // If no verses found, try plain string parsing as fallback
  if (verses.length === 0) {
    // If we have XML but no verses, it might be malformed
    // Try to extract any text content as a fallback
    console.warn('XML detected but no verses found, falling back to string parsing');
    return parseVersesFromString(xmlString);
  }

  return verses;
}

/**
 * Parse verses from plain string format (with \n\n separators)
 */
export function parseVersesFromString(versesString: string): ParsedVerse[] {
  if (!versesString || !versesString.trim()) {
    return [{ order: 1, content: '', label: null, type: 'verse' }];
  }

  // Split by double newlines (paragraph breaks)
  const blocks = versesString.split(/\n\n+/).filter(block => block.trim());

  if (blocks.length === 0) {
    return [{ order: 1, content: versesString.trim(), label: null, type: 'verse' }];
  }

  return blocks.map((block, index) => ({
    order: index + 1,
    content: block.trim(),
    label: null,
    type: 'verse' as const,
  }));
}

/**
 * Parse verses from either XML or string format (auto-detect)
 * Also handles array format with originalLabel from API
 * @param versesInput - Verses string (XML or plain text) or array
 * @param verseOrder - Optional verse_order string from OpenLP SQLite (e.g., "v1 c1 v2 c1 v3 c1") - used to sort verses correctly
 * @param lyricsXml - Optional exact XML from SQLite lyrics column (1:1 transparent) - if provided, use this instead of versesInput
 * @param versesArray - Optional verses array from API with originalLabel - if provided, use this for logic (PRIORITY 1)
 */
export function parseVerses(
  versesInput:
    | string
    | Array<{ order: number; content: string; label: string | null; originalLabel?: string }>
    | undefined
    | null,
  verseOrder?: string | null,
  lyricsXml?: string | null,
  versesArray?: Array<{
    order: number;
    content: string;
    label?: string;
    originalLabel?: string;
  }> | null
): ParsedVerse[] {
  // PRIORITY 0: If versesArray from API is provided, use it directly (has originalLabel from database)
  // This is the most reliable source - originalLabel comes directly from MongoDB
  if (versesArray && Array.isArray(versesArray) && versesArray.length > 0) {
    const parsedFromArray: ParsedVerse[] = versesArray.map(v => {
      // Use originalLabel for logic, but map to readable label for display
      const readableLabel = v.label || mapOriginalLabelToReadable(v.originalLabel);

      return {
        order: v.order,
        content: v.content,
        label: readableLabel,
        type: parseVerseType(v.originalLabel || v.label || 'verse'),
        originalLabel: v.originalLabel, // Keep originalLabel for verseOrder matching
      };
    });

    // Apply verseOrder if provided to reorder verses
    if (verseOrder && verseOrder.trim() && parsedFromArray.length > 0) {
      try {
        const reorderedVerses = parseVerseOrderString(verseOrder.trim(), parsedFromArray);
        return reorderedVerses;
      } catch (error) {
        console.warn(
          '[parseVerses] Failed to parse verseOrder from versesArray, using array order:',
          error
        );
        return parsedFromArray.sort((a, b) => a.order - b.order);
      }
    }

    return parsedFromArray.sort((a, b) => a.order - b.order);
  }

  // PRIORITY 1: If lyricsXml is provided, use it directly (1:1 transparent with SQLite)
  // This preserves exact XML structure, CDATA, type/label attributes, etc.
  if (lyricsXml && lyricsXml.trim()) {
    const lyricsXmlContent = lyricsXml.trim();
    let parsedFromXml: ParsedVerse[] = [];

    // Check if it's a full XML document with <song><lyrics>...</lyrics></song>
    if (lyricsXmlContent.includes('<lyrics')) {
      // Extract lyrics section from full XML document
      const lyricsMatch = lyricsXmlContent.match(/<lyrics[^>]*>([\s\S]*?)<\/lyrics>/i);
      if (lyricsMatch && lyricsMatch[1]) {
        // Parse extracted lyrics section (contains verse tags with CDATA, type/label attributes, etc.)
        parsedFromXml = parseVersesFromXml(lyricsMatch[1].trim());
      } else {
        // Try to extract everything after <lyrics> if no closing tag
        const lyricsMatchOpen = lyricsXmlContent.match(/<lyrics[^>]*>([\s\S]*)/i);
        if (lyricsMatchOpen && lyricsMatchOpen[1]) {
          parsedFromXml = parseVersesFromXml(lyricsMatchOpen[1].trim());
        }
      }
    } else {
      // Already just the lyrics section (verse tags), parse directly
      parsedFromXml = parseVersesFromXml(lyricsXmlContent);
    }

    // IMPORTANT: Apply verseOrder if provided to ensure correct sequence (1:1 transparent with SQLite)
    if (verseOrder && verseOrder.trim() && parsedFromXml.length > 0) {
      try {
        // Use parseVerseOrderString to reorder verses according to verseOrder
        const reorderedVerses = parseVerseOrderString(verseOrder.trim(), parsedFromXml);
        return reorderedVerses;
      } catch (error) {
        console.warn(
          '[parseVerses] Failed to parse verseOrder from lyricsXml, using XML order:',
          error
        );
        // Fall back to XML order if verseOrder parsing fails
        return parsedFromXml.sort((a, b) => a.order - b.order);
      }
    }

    // No verseOrder provided, return parsed verses sorted by order
    return parsedFromXml.sort((a, b) => a.order - b.order);
  }

  // PRIORITY 2: Use versesInput (fallback if lyricsXml not available)
  // Handle null, undefined
  if (!versesInput) {
    return [{ order: 1, content: '', label: null, type: 'verse' }];
  }

  // Handle array format (legacy/incorrect API response)
  // API sometimes returns: [{ order: 1, content: "<?xml>...", label: null }]
  if (Array.isArray(versesInput)) {
    if (versesInput.length === 0) {
      return [{ order: 1, content: '', label: null, type: 'verse' }];
    }
    // If array contains objects with content, extract the content string and parse it
    // This handles cases where API incorrectly returns verses as array
    const firstItem = versesInput[0];
    if (firstItem && typeof firstItem === 'object' && 'content' in firstItem) {
      // Extract the content string and parse it
      const contentString = firstItem.content;
      if (typeof contentString === 'string' && contentString.trim()) {
        // Recursively parse the content string (which should be XML or plain text)
        return parseVerses(contentString, verseOrder, null);
      }
    }
    // If array format is unexpected, return empty
    return [{ order: 1, content: '', label: null, type: 'verse' }];
  }

  // Handle string format
  if (typeof versesInput !== 'string') {
    return [{ order: 1, content: '', label: null, type: 'verse' }];
  }

  // Ensure it's a string before calling trim
  const trimmed = versesInput.trim();
  if (!trimmed) {
    return [{ order: 1, content: '', label: null, type: 'verse' }];
  }

  // Parse verses from XML or string
  let parsedVerses: ParsedVerse[];
  if (trimmed.startsWith('<') && (trimmed.includes('verse') || trimmed.includes('</verse>'))) {
    parsedVerses = parseVersesFromXml(trimmed);
  } else {
    parsedVerses = parseVersesFromString(trimmed);
  }

  // If verseOrder is provided, use it to sort verses correctly (1:1 transparent with SQLite)
  if (verseOrder && verseOrder.trim() && parsedVerses.length > 0) {
    try {
      // Use parseVerseOrderString to reorder verses according to verseOrder
      const reorderedVerses = parseVerseOrderString(verseOrder.trim(), parsedVerses);
      return reorderedVerses;
    } catch (error) {
      console.warn('[parseVerses] Failed to parse verseOrder, using default order:', error);
      // Fall back to default order if verseOrder parsing fails
      return parsedVerses.sort((a, b) => a.order - b.order);
    }
  }

  // No verseOrder provided, return parsed verses sorted by order
  return parsedVerses.sort((a, b) => a.order - b.order);
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate verse label from type and order
 */
function generateVerseLabel(type: ParsedVerse['type'], order: number): string {
  switch (type) {
    case 'chorus':
      return 'c1';
    case 'bridge':
      return `b${order}`;
    case 'pre-chorus':
      return `p${order}`;
    case 'tag':
      return `t${order}`;
    case 'verse':
    default:
      return `v${order}`;
  }
}

/**
 * Map originalLabel (e.g., "v1", "c1", "b1") to readable label (e.g., "Verse 1", "Chorus 1", "Bridge 1")
 * This is used for display purposes - frontend uses originalLabel for logic, but displays readable labels
 */
export function mapOriginalLabelToReadable(
  originalLabel: string | undefined | null
): string | null {
  if (!originalLabel) return null;

  const labelLower = originalLabel.toLowerCase().trim();

  if (labelLower.startsWith('v')) {
    const num = labelLower.match(/\d+/)?.[0];
    return num ? `Verse ${num}` : 'Verse';
  } else if (labelLower.startsWith('c')) {
    const num = labelLower.match(/\d+/)?.[0];
    return num ? `Chorus ${num}` : 'Chorus';
  } else if (labelLower.startsWith('b')) {
    const num = labelLower.match(/\d+/)?.[0];
    return num ? `Bridge ${num}` : 'Bridge';
  } else if (labelLower.startsWith('p')) {
    const num = labelLower.match(/\d+/)?.[0];
    return num ? `Pre-Chorus ${num}` : 'Pre-Chorus';
  } else if (labelLower.startsWith('t')) {
    const num = labelLower.match(/\d+/)?.[0];
    return num ? `Tag ${num}` : 'Tag';
  }

  return originalLabel;
}

/**
 * Combine parsed verses back to XML format (OpenLP format)
 * IMPORTANT: Preserves verse_order by sorting by order before combining.
 * The sequence in the resulting XML corresponds to verse_order in OpenLP SQLite.
 *
 * Format: <verse label="v1">content</verse><verse label="v2">content</verse>
 * (No wrapping in <lyrics> tags - OpenLP stores verses directly)
 */
export function combineVersesToXml(verses: ParsedVerse[]): string {
  const sortedVerses = verses
    .filter(v => v.content && v.content.trim())
    .sort((a, b) => a.order - b.order); // Preserve verse_order from OpenLP

  if (sortedVerses.length === 0) {
    return '';
  }

  // Generate XML format: <verse label="v1">content</verse>
  // Use originalLabel if available (for logic), otherwise generate from label or type
  const verseTags = sortedVerses.map(v => {
    let label: string;
    const verseType = v.type || 'verse';
    const prefix = getVerseTypePrefix(verseType);

    // PRIORITY 1: Use originalLabel if available (e.g., "v1", "c1") - this is the source of truth
    if (v.originalLabel) {
      const originalLabelLower = v.originalLabel.toLowerCase();
      // Check if originalLabel matches the prefix (e.g., "c1", "v2")
      if (originalLabelLower.startsWith(prefix)) {
        label = v.originalLabel;
      } else {
        // originalLabel doesn't match prefix, extract number from it
        const numMatch = originalLabelLower.match(/\d+/);
        if (numMatch) {
          label = `${prefix}${numMatch[0]}`;
        } else {
          // No number in originalLabel, generate based on type and order
          label = generateVerseLabel(verseType, v.order);
        }
      }
    } else if (v.label) {
      // PRIORITY 2: Use label if originalLabel not available
      const labelLower = v.label.toLowerCase();
      // Check if label already starts with the correct prefix (e.g., "c1" for chorus, "v2" for verse)
      if (labelLower.startsWith(prefix)) {
        // Label matches type, preserve it (e.g., "c1", "v2")
        label = v.label;
      } else {
        // Label doesn't match type (user changed type), extract number if available
        const numMatch = labelLower.match(/\d+/);
        if (numMatch) {
          // Use the number from old label with new type prefix (e.g., "v1" -> "c1" if changed to chorus)
          label = `${prefix}${numMatch[0]}`;
        } else {
          // No number in label, generate based on type and order
          label = generateVerseLabel(verseType, v.order);
        }
      }
    } else {
      // PRIORITY 3: No label or originalLabel, generate based on type and order
      label = generateVerseLabel(verseType, v.order);
    }

    const escapedContent = escapeXml(v.content.trim());
    return `<verse label="${label}">${escapedContent}</verse>`;
  });

  // Return verses without wrapping tags (OpenLP format)
  return verseTags.join('');
}

/**
 * Combine parsed verses back to plain string format (for storage)
 * IMPORTANT: Preserves verse_order by sorting by order before combining.
 * The sequence in the resulting string corresponds to verse_order in OpenLP.
 *
 * @deprecated Use combineVersesToXml to preserve XML format
 */
export function combineVersesToString(verses: ParsedVerse[]): string {
  return verses
    .sort((a, b) => a.order - b.order) // Preserve verse_order from OpenLP
    .map(v => v.content.trim())
    .filter(content => content.length > 0)
    .join('\n\n');
}

/**
 * Get display label for a verse
 * Uses originalLabel for logic, but maps to readable label for display
 */
export function getVerseDisplayLabel(verse: ParsedVerse, index: number): string {
  // PRIORITY 1: Use originalLabel to map to readable label (e.g., "v1" -> "Verse 1")
  if (verse.originalLabel) {
    const readableLabel = mapOriginalLabelToReadable(verse.originalLabel);
    if (readableLabel) {
      return readableLabel;
    }
  }

  // PRIORITY 2: Use existing label if it's already readable
  if (verse.label) {
    const label = verse.label.toLowerCase();
    // If label is already readable (e.g., "Verse 1", "Chorus"), use it
    if (
      label.includes('verse') ||
      label.includes('chorus') ||
      label.includes('bridge') ||
      label.includes('pre-chorus') ||
      label.includes('tag')
    ) {
      return verse.label;
    }
    // Otherwise, try to convert OpenLP labels to readable format
    if (label.startsWith('v')) {
      const num = label.slice(1) || index + 1;
      return `Verse ${num}`;
    }
    if (label.startsWith('c')) {
      return 'Chorus';
    }
    if (label.startsWith('b')) {
      const num = label.slice(1) || '';
      return num ? `Bridge ${num}` : 'Bridge';
    }
    if (label.startsWith('p')) {
      return 'Pre-Chorus';
    }
    if (label.startsWith('t')) {
      return 'Tag';
    }
    return verse.label;
  }

  // PRIORITY 3: Default labels based on type
  if (verse.type === 'chorus') {
    return 'Chorus';
  }
  if (verse.type === 'bridge') {
    return 'Bridge';
  }
  if (verse.type === 'pre-chorus') {
    return 'Pre-Chorus';
  }
  if (verse.type === 'tag') {
    return 'Tag';
  }

  return `Verse ${verse.order}`;
}

/**
 * Get verse type prefix for order string (v, c, b, p, t)
 */
export function getVerseTypePrefix(type?: ParsedVerse['type']): string {
  switch (type) {
    case 'chorus':
      return 'c';
    case 'bridge':
      return 'b';
    case 'pre-chorus':
      return 'p';
    case 'tag':
      return 't';
    case 'verse':
    default:
      return 'v';
  }
}

/**
 * Generate verse order string like "v1 c1 v2 c1 v3 c1 v4 c1"
 * This represents the visual order of verses for editing
 * Uses originalLabel if available (for logic), otherwise falls back to label or order
 */
export function generateVerseOrderString(verses: ParsedVerse[]): string {
  const sortedVerses = [...verses].sort((a, b) => a.order - b.order);
  return sortedVerses
    .map(v => {
      const prefix = getVerseTypePrefix(v.type);

      // PRIORITY 1: Use originalLabel if available (e.g., "v1", "c1") - this is the source of truth
      if (v.originalLabel) {
        const originalLabelLower = v.originalLabel.toLowerCase();
        // Check if originalLabel matches the prefix (e.g., "c1", "v2")
        if (originalLabelLower.startsWith(prefix)) {
          const numFromOriginalLabel = originalLabelLower.slice(prefix.length);
          if (numFromOriginalLabel) {
            return `${prefix}${numFromOriginalLabel}`;
          }
        }
        // If originalLabel doesn't match prefix, extract number from it
        const numMatch = originalLabelLower.match(/\d+/);
        if (numMatch) {
          return `${prefix}${numMatch[0]}`;
        }
      }

      // PRIORITY 2: Extract number from label if available (e.g., "c1" -> "1", "v2" -> "2")
      // Otherwise use order
      let number: string | number;
      if (v.label) {
        const labelLower = v.label.toLowerCase();
        // Check if label starts with the prefix (e.g., "c1", "v2")
        if (labelLower.startsWith(prefix)) {
          const numFromLabel = labelLower.slice(prefix.length);
          if (numFromLabel) {
            number = numFromLabel;
          } else {
            // If label is just the prefix (e.g., "c"), use 1 for chorus, order for others
            number = v.type === 'chorus' ? '1' : v.order;
          }
        } else {
          // Label doesn't match prefix, extract any number from it
          const numMatch = labelLower.match(/\d+/);
          number = numMatch ? numMatch[0] : v.order;
        }
      } else {
        // No label, use order (but for chorus, default to 1)
        number = v.type === 'chorus' ? '1' : v.order;
      }

      return `${prefix}${number}`;
    })
    .join(' ');
}

/**
 * Parse verse order string like "v1 c1 v2 c1 v3 c1 v4 c1" and create verse list with repetitions
 * Returns verses with duplicates for repeated references, each with unique order
 */
export function parseVerseOrderString(orderString: string, verses: ParsedVerse[]): ParsedVerse[] {
  // Parse the order string: "v1 c1 v2 c1" -> [{type: 'verse', order: 1}, {type: 'chorus', order: 1}, ...]
  const orderPattern = /([vcbpt])(\d+)/gi;
  const matches = Array.from(orderString.matchAll(orderPattern));

  if (matches.length === 0) {
    // Invalid format - check if there's any content
    if (orderString.trim().length > 0) {
      throw new Error(
        'Invalid verse order format. Expected format: v1 c1 v2 (v=verse, c=chorus, b=bridge, p=pre-chorus, t=tag)'
      );
    }
    // Empty string, return verses unchanged
    return verses;
  }

  // Map type prefix to verse type
  const typeMap: Record<string, ParsedVerse['type']> = {
    v: 'verse',
    c: 'chorus',
    b: 'bridge',
    p: 'pre-chorus',
    t: 'tag',
  };

  // Create a map of original verses for quick lookup
  // PRIORITY 1: Use originalLabel if available (direct match: "v1" -> verse with originalLabel="v1")
  // PRIORITY 2: Fall back to type+labelNumber matching (for backward compatibility)
  const verseMap = new Map<string, ParsedVerse>();
  verses.forEach(verse => {
    const verseType = verse.type || 'verse';

    // PRIORITY 1: If originalLabel exists, use it for direct matching (e.g., "v1", "c1")
    if (verse.originalLabel) {
      const originalLabelLower = verse.originalLabel.toLowerCase();
      // Direct match: "v1" from verseOrder matches verse with originalLabel="v1"
      verseMap.set(originalLabelLower, verse);
    }

    // PRIORITY 2: Also index by type+order for fallback
    const keyByOrder = `${verseType}-${verse.order}`;
    if (!verseMap.has(keyByOrder)) {
      verseMap.set(keyByOrder, verse);
    }

    // PRIORITY 3: Also index by label number if label exists (for backward compatibility)
    if (verse.label) {
      const labelLower = verse.label.toLowerCase();
      const prefix = getVerseTypePrefix(verseType);

      // Extract number from label (e.g., "c1" -> "1", "v2" -> "2")
      let labelNum: string | null = null;
      if (labelLower.startsWith(prefix)) {
        labelNum = labelLower.slice(prefix.length);
      } else {
        // Label might be just a number (e.g., "1" for chorus)
        const numMatch = labelLower.match(/\d+/);
        if (numMatch) {
          labelNum = numMatch[0];
        }
      }

      if (labelNum) {
        const keyByLabel = `${verseType}-${labelNum}`;
        // Only set if not already set (prefer first match)
        if (!verseMap.has(keyByLabel)) {
          verseMap.set(keyByLabel, verse);
        }
      }
    }
  });

  // Build new verse list based on order string, allowing duplicates
  const resultVerses: ParsedVerse[] = [];

  matches.forEach((match, index) => {
    const typePrefix = match[1].toLowerCase();
    const labelNumber = match[2]; // Keep as string to match label numbers
    const verseType = typeMap[typePrefix] || 'verse';
    const newOrder = index + 1;

    // Build the original identifier (e.g., "v1", "c1", "b1")
    const originalIdentifier = `${typePrefix}${labelNumber}`;

    // PRIORITY 1: Try direct match using originalLabel (e.g., "v1" matches verse with originalLabel="v1")
    let originalVerse = verseMap.get(originalIdentifier);

    // PRIORITY 2: If not found, try by type and label number (for backward compatibility)
    if (!originalVerse) {
      const keyByLabel = `${verseType}-${labelNumber}`;
      originalVerse = verseMap.get(keyByLabel);
    }

    // PRIORITY 3: If still not found, try by order (for verses that don't have matching labels)
    if (!originalVerse) {
      const orderNum = parseInt(labelNumber, 10);
      const keyByOrder = `${verseType}-${orderNum}`;
      originalVerse = verseMap.get(keyByOrder);
    }

    if (originalVerse) {
      // Create a copy with the new order (allows same verse to appear multiple times)
      resultVerses.push({
        ...originalVerse,
        order: newOrder,
        // Preserve the original label and originalLabel for XML generation and logic
        label: originalVerse.label,
        originalLabel: originalVerse.originalLabel, // Preserve originalLabel for verseOrder matching
        type: verseType,
      });
    } else {
      // Verse not found, create a placeholder
      resultVerses.push({
        order: newOrder,
        content: '',
        label: null,
        type: verseType,
      });
    }
  });

  return resultVerses;
}
