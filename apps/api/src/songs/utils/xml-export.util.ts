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
 * Parse verses string and generate XML verse tags
 * Handles the verse order string format (e.g., "v1 c1 v2 c1")
 */
function parseVersesToXml(versesString: string | null | undefined, chorus?: string | null): string {
  // Ensure versesString is a string
  const verses = typeof versesString === 'string' ? versesString : '';
  
  if (!verses && !chorus) {
    return '';
  }

  const parts: string[] = [];

  // Add chorus if present
  if (chorus && typeof chorus === 'string' && chorus.trim()) {
    parts.push(`<verse label="c">${escapeXml(chorus.trim())}</verse>`);
  }

  // Parse verses string - it should already be in XML format or plain text
  if (verses && verses.trim()) {
    // Check if it's already XML format
    if (verses.trim().startsWith('<verse')) {
      // Already XML, use as-is (but ensure proper escaping)
      // Extract verse tags and re-escape content
      // Handle both single and double quotes in label attribute
      const verseRegex = /<verse\s+(?:label=["']([^"']+)["']|label=([^\s>]+))[^>]*>([\s\S]*?)<\/verse>/gi;
      let match;
      while ((match = verseRegex.exec(verses)) !== null) {
        const label = match[1] || match[2]; // Handle both quote styles
        let content = match[3];
        // Decode existing XML entities
        content = content
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        // Re-escape for output
        parts.push(`<verse label="${label}">${escapeXml(content.trim())}</verse>`);
      }
    } else {
      // Plain text - split by double newlines to get individual verses
      const verseBlocks = verses.split(/\n\n+/).filter(block => block.trim());
      
      if (verseBlocks.length > 0) {
        verseBlocks.forEach((block, index) => {
          const verseNum = index + 1;
          parts.push(`<verse label="v${verseNum}">${escapeXml(block.trim())}</verse>`);
        });
      } else {
        // Single verse, no double newlines
        parts.push(`<verse label="v1">${escapeXml(verses.trim())}</verse>`);
      }
    }
  }

  return parts.join('');
}

/**
 * Generate full OpenLP XML format for a song
 */
export function generateSongXml(song: {
  title: string;
  number?: string | null;
  chorus?: string | null;
  verses: string | null | undefined;
  copyright?: string | null;
  comments?: string | null;
  ccliNumber?: string | null;
  tags?: Array<{ name: string }> | string[];
}): string {
  // Ensure verses is a string
  const verses = typeof song.verses === 'string' ? song.verses : (song.verses || '');
  const lyricsXml = parseVersesToXml(verses, song.chorus);
  
  // Get tags as comma-separated string
  let themeName = '';
  if (song.tags && song.tags.length > 0) {
    if (typeof song.tags[0] === 'string') {
      themeName = song.tags.join(', ');
    } else {
      themeName = song.tags.map(t => t.name).join(', ');
    }
  }

  // Build XML document
  const xmlParts: string[] = [];
  xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlParts.push('<song>');
  xmlParts.push(`  <title>${escapeXml(song.title)}</title>`);
  
  if (song.number) {
    xmlParts.push(`  <alternate_title>${escapeXml(song.number)}</alternate_title>`);
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

