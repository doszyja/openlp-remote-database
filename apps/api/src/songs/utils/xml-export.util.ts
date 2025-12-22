/**
 * Utility functions for exporting songs to XML format (OpenLP compatible)
 */

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
 * Parse verses (array or string) and generate XML verse tags
 * Handles both new format (array of objects with order) and legacy format (string)
 */
function parseVersesToXml(verses: any): string {
  if (!verses) {
    return '';
  }

  const parts: string[] = [];

  // Handle new format: array of objects with order (chorus is included in verses array with type='chorus')
  if (Array.isArray(verses) && verses.length > 0) {
    // Sort by order to ensure correct sequence
    const sortedVerses = [...verses].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );

    sortedVerses.forEach((verse) => {
      if (!verse.content || !verse.content.trim()) return;

      // Determine label from verse.label or verse.order
      let label = verse.label;
      if (!label) {
        // Generate label from order
        label = `v${verse.order || 1}`;
      } else {
        // Normalize label (remove "Verse " prefix if present)
        label = label.replace(/^verse\s+/i, 'v');
      }

      parts.push(
        `<verse label="${label}">${escapeXml(verse.content.trim())}</verse>`,
      );
    });
  }
  // Handle legacy format: string
  else if (typeof verses === 'string' && verses.trim()) {
    const versesString = verses.trim();

    // Check if it's already XML format
    if (versesString.startsWith('<verse')) {
      // Already XML, use as-is (but ensure proper escaping)
      const verseRegex =
        /<verse\s+(?:label=["']([^"']+)["']|label=([^\s>]+))[^>]*>([\s\S]*?)<\/verse>/gi;
      let match;
      while ((match = verseRegex.exec(versesString)) !== null) {
        const label = match[1] || match[2];
        let content = match[3];
        // Decode existing XML entities
        content = content
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        // Re-escape for output
        parts.push(
          `<verse label="${label}">${escapeXml(content.trim())}</verse>`,
        );
      }
    } else {
      // Plain text - split by double newlines to get individual verses
      const verseBlocks = versesString
        .split(/\n\n+/)
        .filter((block) => block.trim());

      if (verseBlocks.length > 0) {
        verseBlocks.forEach((block, index) => {
          const verseNum = index + 1;
          parts.push(
            `<verse label="v${verseNum}">${escapeXml(block.trim())}</verse>`,
          );
        });
      } else {
        // Single verse, no double newlines
        parts.push(`<verse label="v1">${escapeXml(versesString)}</verse>`);
      }
    }
  }

  return parts.join('');
}

/**
 * Generate full OpenLP XML format for a song
 * If lyricsXml is provided, use it directly (1:1 transparent with SQLite)
 * Otherwise, generate XML from verses array/string
 */
export function generateSongXml(song: {
  title: string;
  number?: string | null;
  verses: any; // Can be array of objects with order, or string (legacy) - chorus is included in verses array with type='chorus'
  lyricsXml?: string | null; // Exact XML from SQLite lyrics column (1:1 transparent)
  copyright?: string | null;
  comments?: string | null;
  ccliNumber?: string | null;
  tags?: Array<{ name: string }> | string[];
}): string {
  // PRIORITY 1: If lyricsXml exists, extract lyrics section from it (1:1 transparent with SQLite)
  // This preserves exact XML structure, CDATA, type/label attributes, etc.
  let lyricsXml: string;
  if (song.lyricsXml && song.lyricsXml.trim()) {
    const lyricsXmlContent = song.lyricsXml.trim();

    // Check if it's a full XML document with <song><lyrics>...</lyrics></song>
    if (lyricsXmlContent.includes('<lyrics')) {
      // Extract lyrics section from full XML document
      const lyricsMatch = lyricsXmlContent.match(
        /<lyrics[^>]*>([\s\S]*?)<\/lyrics>/i,
      );
      if (lyricsMatch && lyricsMatch[1]) {
        // Use extracted lyrics section (contains verse tags with CDATA, type/label attributes, etc.)
        lyricsXml = lyricsMatch[1].trim();
      } else {
        // Try to extract everything after <lyrics> if no closing tag
        const lyricsMatchOpen = lyricsXmlContent.match(
          /<lyrics[^>]*>([\s\S]*)/i,
        );
        if (lyricsMatchOpen && lyricsMatchOpen[1]) {
          lyricsXml = lyricsMatchOpen[1].trim();
        } else {
          // Fallback: use entire content if it's just verse tags
          lyricsXml = lyricsXmlContent;
        }
      }
    } else {
      // Already just the lyrics section (verse tags), use as-is
      lyricsXml = lyricsXmlContent;
    }
  } else {
    // PRIORITY 2: Generate XML from verses array/string (fallback)
    // Chorus is included in verses array with type='chorus', so no need for separate chorus parameter
    const verses = song.verses || (Array.isArray(song.verses) ? [] : '');
    lyricsXml = parseVersesToXml(verses);
  }

  // Get tags as comma-separated string
  let themeName = '';
  if (song.tags && song.tags.length > 0) {
    if (typeof song.tags[0] === 'string') {
      themeName = song.tags.join(', ');
    } else {
      themeName = song.tags.map((t) => t.name).join(', ');
    }
  }

  // Build XML document
  const xmlParts: string[] = [];
  xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlParts.push('<song>');
  xmlParts.push(`  <title>${escapeXml(song.title)}</title>`);

  if (song.number) {
    xmlParts.push(
      `  <alternate_title>${escapeXml(song.number)}</alternate_title>`,
    );
  }

  if (song.ccliNumber) {
    xmlParts.push(`  <ccli_number>${escapeXml(song.ccliNumber)}</ccli_number>`);
  }

  if (song.copyright) {
    xmlParts.push(`  <copyright>${escapeXml(song.copyright)}</copyright>`);
  }

  if (song.comments) {
    xmlParts.push(`  <comments>${escapeXml(song.comments)}</comments>`);
  }

  if (themeName) {
    xmlParts.push(`  <theme_name>${escapeXml(themeName)}</theme_name>`);
  }

  xmlParts.push('  <lyrics>');
  xmlParts.push(`    ${lyricsXml}`);
  xmlParts.push('  </lyrics>');
  xmlParts.push('</song>');

  return xmlParts.join('\n');
}

/**
 * Sanitize filename - remove invalid characters and ensure it's safe for filesystem
 */
export function sanitizeFilename(title: string): string {
  // Remove invalid characters for Windows/Linux/Mac
  // Replace invalid chars with underscore
  let sanitized = title
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Remove leading/trailing dots and spaces (Windows doesn't allow these)
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

  // Limit length (Windows has 255 char limit for filename)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  // If empty after sanitization, use default
  if (!sanitized) {
    sanitized = 'song';
  }

  return sanitized;
}
