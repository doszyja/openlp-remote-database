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
 * Convert verse content to lines format with <br /> tags
 * Splits content by newlines and wraps each line in <lines> tag
 * Format matches xml-format.xml: lines with <br /> between them
 */
function formatVerseLines(content: string): string {
  if (!content || !content.trim()) {
    return '<lines></lines>';
  }

  // Split by newlines and filter empty lines
  const lines = content
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return '<lines></lines>';
  }

  // Join lines with <br /> (with spaces around) and wrap in <lines> tag
  // Format: <lines> Line 1 <br /> Line 2 <br /> Line 3 </lines>
  const linesContent = lines
    .map((line) => escapeXml(line))
    .join(' <br /> ');

  return `<lines> ${linesContent} </lines>`;
}

/**
 * Extract verse name from label or generate from order/type
 * Returns format like "v1", "c1", "b1", etc.
 */
function getVerseName(verse: any): string {
  // Try to extract from label (e.g., "Verse 1" -> "v1", "Chorus 1" -> "c1")
  if (verse.label) {
    const labelLower = verse.label.toLowerCase();
    // Check for readable format like "Verse 1", "Chorus 1"
    if (labelLower.includes('verse')) {
      const numMatch = labelLower.match(/\d+/);
      return numMatch ? `v${numMatch[0]}` : 'v1';
    }
    if (labelLower.includes('chorus')) {
      const numMatch = labelLower.match(/\d+/);
      return numMatch ? `c${numMatch[0]}` : 'c1';
    }
    if (labelLower.includes('bridge')) {
      const numMatch = labelLower.match(/\d+/);
      return numMatch ? `b${numMatch[0]}` : 'b1';
    }
    if (labelLower.includes('pre-chorus')) {
      const numMatch = labelLower.match(/\d+/);
      return numMatch ? `p${numMatch[0]}` : 'p1';
    }
    if (labelLower.includes('tag')) {
      const numMatch = labelLower.match(/\d+/);
      return numMatch ? `t${numMatch[0]}` : 't1';
    }
    // Check for short format (v1, c1, etc.)
    const shortFormatMatch = labelLower.match(/^([vcbpt])(\d*)$/);
    if (shortFormatMatch) {
      const prefix = shortFormatMatch[1];
      const num = shortFormatMatch[2] || '1';
      return `${prefix}${num}`;
    }
  }

  // Use originalLabel if available (e.g., "v1", "c1")
  if (verse.originalLabel) {
    return verse.originalLabel.toLowerCase();
  }

  // Generate from type and order
  const type = verse.type || 'verse';
  const prefix = type === 'chorus' ? 'c' : type === 'bridge' ? 'b' : type === 'pre-chorus' ? 'p' : type === 'tag' ? 't' : 'v';
  const num = verse.order || 1;
  return `${prefix}${num}`;
}

/**
 * Parse verses (array or string) and generate OpenLyrics XML verse tags
 * Handles both new format (array of objects with order) and legacy format (string)
 * Returns format: <verse name="v1"><lines>...</lines></verse>
 */
function parseVersesToOpenLyricsXml(verses: any, verseOrder?: string | null): string {
  if (!verses) {
    return '';
  }

  const parts: string[] = [];
  let versesToProcess: any[] = [];

  // Handle new format: array of objects with order
  if (Array.isArray(verses) && verses.length > 0) {
    versesToProcess = verses
      .filter((v) => v.content && v.content.trim())
      .map((v) => ({
        ...v,
        // Ensure name is set from originalLabel if available
        name: v.originalLabel || v.name || getVerseName(v),
      }));
  }
  // Handle legacy format: string
  else if (typeof verses === 'string' && verses.trim()) {
    const versesString = verses.trim();
    // Check if it's already XML format
    if (versesString.startsWith('<verse')) {
      // Parse existing XML
      const verseRegex =
        /<verse\s+(?:name=["']([^"']+)["']|label=["']([^"']+)["']|name=([^\s>]+)|label=([^\s>]+))[^>]*>([\s\S]*?)<\/verse>/gi;
      let match;
      while ((match = verseRegex.exec(versesString)) !== null) {
        const name = match[1] || match[2] || match[3] || match[4] || 'v1';
        let content = match[5];
        // Decode existing XML entities
        content = content
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        // Remove <lines> tags if present
        content = content.replace(/<lines[^>]*>([\s\S]*?)<\/lines>/gi, '$1');
        // Remove <br /> tags and convert to newlines
        content = content.replace(/<br\s*\/?>/gi, '\n');
        versesToProcess.push({
          name,
          content: content.trim(),
        });
      }
    } else {
      // Plain text - split by double newlines
      const verseBlocks = versesString
        .split(/\n\n+/)
        .filter((block) => block.trim());
      verseBlocks.forEach((block, index) => {
        versesToProcess.push({
          name: `v${index + 1}`,
          content: block.trim(),
        });
      });
    }
  }

  // If verseOrder is provided, use it to order verses (only unique verses, no duplicates)
  if (verseOrder && verseOrder.trim() && versesToProcess.length > 0) {
    const orderParts = verseOrder.trim().split(/\s+/);
    const verseMap = new Map<string, any>();
    
    // Build map of all available verses by name (use originalLabel as primary key)
    versesToProcess.forEach((v) => {
      // PRIORITY 1: Use originalLabel if available (e.g., "v1", "c1") - this is the source of truth
      let name: string;
      if (v.originalLabel) {
        name = v.originalLabel.toLowerCase();
      } else {
        name = (v.name || getVerseName(v)).toLowerCase();
      }
      
      // Store verse in map (if multiple verses with same name, keep the first one with content)
      if (!verseMap.has(name) || (v.content && v.content.trim())) {
        verseMap.set(name, {
          ...v,
          name: v.originalLabel || v.name || getVerseName(v),
        });
      }
    });

    // Build ordered verses list - only unique verses (first occurrence from verseOrder)
    const orderedVerses: any[] = [];
    const addedVerses = new Set<string>(); // Track which verses have been added
    
    orderParts.forEach((part) => {
      const partLower = part.toLowerCase();
      
      // Only add verse if it hasn't been added yet (prevent duplicates)
      if (!addedVerses.has(partLower)) {
        const verse = verseMap.get(partLower);
        if (verse) {
          orderedVerses.push({
            ...verse,
            name: verse.name || part, // Use name from verse or fallback to part from verseOrder
          });
          addedVerses.add(partLower); // Mark as added
        } else {
          // Verse not found in map - log warning but continue
          console.warn(`[xml-export] Verse "${part}" from verseOrder not found in verses array`);
        }
      }
    });

    // Add any remaining verses not in verseOrder
    versesToProcess.forEach((v) => {
      const name = (v.originalLabel || v.name || getVerseName(v)).toLowerCase();
      if (!addedVerses.has(name)) {
        orderedVerses.push({
          ...v,
          name: v.originalLabel || v.name || getVerseName(v),
        });
        addedVerses.add(name); // Mark as added
      }
    });

    versesToProcess = orderedVerses;
  } else {
    // Sort by order if available
    versesToProcess.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // Generate XML for each verse
  versesToProcess.forEach((verse) => {
    if (!verse.content || !verse.content.trim()) return;

    const name = verse.name || getVerseName(verse);
    const lines = formatVerseLines(verse.content);
    parts.push(`        <verse name="${name}">\n            ${lines}\n        </verse>`);
  });

  return parts.join('\n');
}

/**
 * Generate full OpenLyrics XML format for a song (OpenLP compatible)
 * Format matches xml-format.xml specification
 */
export function generateSongXml(song: {
  title: string;
  number?: string | null;
  verses: any; // Can be array of objects with order, or string (legacy) - chorus is included in verses array with type='chorus'
  verseOrder?: string | null; // verse_order string (e.g., "v1 c1 v2 c1")
  lyricsXml?: string | null; // Exact XML from SQLite lyrics column (1:1 transparent)
  copyright?: string | null;
  comments?: string | null;
  ccliNumber?: string | null;
  tags?: Array<{ name: string }> | string[];
}): string {
  // Get current date/time for modifiedDate
  const now = new Date();
  const modifiedDate = now.toISOString().replace(/\.\d{3}Z$/, '');

  // Get tags as songbook names
  const songbookNames: string[] = [];
  if (song.tags && song.tags.length > 0) {
    if (typeof song.tags[0] === 'string') {
      songbookNames.push(...(song.tags as string[]));
    } else {
      songbookNames.push(...(song.tags as Array<{ name: string }>).map((t) => t.name));
    }
  }

  // Get verseOrder or generate from verses
  let verseOrderString = song.verseOrder || null;
  if (!verseOrderString && Array.isArray(song.verses) && song.verses.length > 0) {
    // Generate verseOrder from verses array
    const sortedVerses = [...song.verses].sort((a, b) => (a.order || 0) - (b.order || 0));
    verseOrderString = sortedVerses
      .map((v) => getVerseName(v))
      .join(' ');
  }

  // Generate lyrics XML
  let lyricsXml: string;
  if (song.lyricsXml && song.lyricsXml.trim()) {
    // If lyricsXml exists, try to extract verses from it
    const lyricsXmlContent = song.lyricsXml.trim();
    
    // Check if it's OpenLyrics format with <verse name="..."><lines>...</lines></verse>
    if (lyricsXmlContent.includes('<verse') && lyricsXmlContent.includes('<lines>')) {
      // Extract verses from OpenLyrics format
      const verseRegex = /<verse\s+name=["']([^"']+)["'][^>]*>[\s\S]*?<lines>([\s\S]*?)<\/lines>[\s\S]*?<\/verse>/gi;
      const verses: any[] = [];
      let match;
      while ((match = verseRegex.exec(lyricsXmlContent)) !== null) {
        const name = match[1];
        let content = match[2];
        // Decode XML entities and convert <br /> to newlines
        content = content
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/<br\s*\/?>/gi, '\n')
          .trim();
        verses.push({ name, content });
      }
      lyricsXml = parseVersesToOpenLyricsXml(verses, verseOrderString);
    } else {
      // Fallback: generate from verses array/string
      lyricsXml = parseVersesToOpenLyricsXml(song.verses, verseOrderString);
    }
  } else {
    // Generate XML from verses array/string
    lyricsXml = parseVersesToOpenLyricsXml(song.verses, verseOrderString);
  }

  // Build OpenLyrics XML document
  const xmlParts: string[] = [];
  xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlParts.push(
    `<song xmlns="http://openlyrics.info/namespace/2009/song" version="0.8" createdIn="OpenLP 3.0.2" modifiedIn="OpenLP 3.0.2" modifiedDate="${modifiedDate}">`
  );
  xmlParts.push('    <properties>');
  xmlParts.push('        <titles>');
  xmlParts.push(`            <title>${escapeXml(song.title)}</title>`);
  xmlParts.push('        </titles>');
  
  if (verseOrderString) {
    xmlParts.push(`        <verseOrder>${escapeXml(verseOrderString)}</verseOrder>`);
  }

  // Add authors (use comments or default)
  xmlParts.push('        <authors>');
  if (song.comments) {
    xmlParts.push(`            <author>${escapeXml(song.comments)}</author>`);
  } else {
    xmlParts.push('            <author>Nieznany</author>');
  }
  xmlParts.push('        </authors>');

  // Add songbooks from tags
  if (songbookNames.length > 0) {
    xmlParts.push('        <songbooks>');
    songbookNames.forEach((name) => {
      xmlParts.push(`            <songbook name="${escapeXml(name)}" />`);
    });
    xmlParts.push('        </songbooks>');
  }

  xmlParts.push('    </properties>');
  xmlParts.push('    <lyrics>');
  xmlParts.push(lyricsXml);
  xmlParts.push('    </lyrics>');
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
