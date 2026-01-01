/**
 * Utility functions for exporting service plans to OpenLP format
 */

import * as archiver from 'archiver';

export interface ServicePlanForExport {
  id: string;
  name: string;
  date?: string;
  items: Array<{
    songId: string;
    songTitle: string;
    order: number;
    notes?: string;
    // Full song data for .osz export
    song?: {
      title: string;
      verses: Array<{
        order: number;
        content: string;
        label?: string;
        originalLabel?: string;
      }>;
      verseOrder?: string | null;
      lyricsXml?: string | null;
      copyright?: string | null;
      comments?: string | null;
      ccliNumber?: string | null;
      authors?: string;
      alternateTitle?: string | null;
      openlpId?: number | null; // OpenLP database ID if available
    };
  }>;
}

/**
 * Export service plan to OpenLP XML format
 * OpenLP uses XML format for service plans
 */
export function exportServicePlanToOpenLP(plan: ServicePlanForExport): string {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const openlpHeader =
    '<service xmlns="http://openlp.org/ns/service" version="2.0">\n';

  let xml = xmlHeader + openlpHeader;

  // Add service metadata
  xml += `  <serviceitem type="header" id="header">\n`;
  xml += `    <title><![CDATA[${escapeXml(plan.name)}]]></title>\n`;
  if (plan.date) {
    xml += `    <notes><![CDATA[Data: ${escapeXml(plan.date)}]]></notes>\n`;
  }
  xml += `  </serviceitem>\n`;

  // Add songs in order
  const sortedItems = [...plan.items].sort((a, b) => a.order - b.order);

  for (const item of sortedItems) {
    xml += `  <serviceitem type="song" id="${escapeXml(item.songId)}">\n`;
    xml += `    <title><![CDATA[${escapeXml(item.songTitle)}]]></title>\n`;
    if (item.notes) {
      xml += `    <notes><![CDATA[${escapeXml(item.notes)}]]></notes>\n`;
    }
    xml += `  </serviceitem>\n`;
  }

  xml += '</service>';

  return xml;
}

/**
 * Export service plan to OpenLP .osz format (ZIP archive with JSON)
 * OpenLP .osz files are ZIP archives containing a .osj file (JSON format)
 *
 * Structure based on actual OpenLP .osz file format:
 * - Array of objects
 * - First element: openlp_core metadata
 * - Subsequent elements: serviceitem objects with header and data
 */
export function exportServicePlanToOsz(
  plan: ServicePlanForExport,
): archiver.Archiver {
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });

  const sortedItems = [...plan.items].sort((a, b) => a.order - b.order);

  // Build service data array (OpenLP format)
  const serviceData: any[] = [];

  // First element: openlp_core metadata
  serviceData.push({
    openlp_core: {
      'lite-service': false,
      'service-theme': null,
      'openlp-servicefile-version': 3,
    },
  });

  // Debug: log items count
  console.log(
    `[exportServicePlanToOsz] Processing ${sortedItems.length} items`,
  );

  // Add service items (songs)
  for (let itemIndex = 0; itemIndex < sortedItems.length; itemIndex++) {
    const item = sortedItems[itemIndex];
    const itemOrder = itemIndex + 1; // 1-based order for display

    console.log(
      `[exportServicePlanToOsz] Processing item: songId=${item.songId}, songTitle=${item.songTitle}, hasSong=${!!item.song}`,
    );

    if (!item.song) {
      // Skip items without full song data
      console.warn(
        `[exportServicePlanToOsz] Skipping item ${item.songId} - song data not available`,
      );
      continue;
    }

    const song = item.song;

    // Generate slides (data array) from verses
    const slides: any[] = [];
    const verses = Array.isArray(song.verses) ? song.verses : [];

    // Parse verses from lyricsXml if available and verses array is empty or has no content
    let parsedVerses: Array<{
      order: number;
      content: string;
      label?: string;
      originalLabel?: string;
    }> = [];

    if (
      verses.length > 0 &&
      verses.some((v) => v.content && v.content.trim())
    ) {
      // Use verses array if it has content
      parsedVerses = verses.map((v) => ({
        order: v.order || 0,
        content: v.content || '',
        label: v.label,
        originalLabel: v.originalLabel,
      }));
    } else if (song.lyricsXml && song.lyricsXml.trim()) {
      // Parse from lyricsXml if verses array is empty or has no content
      let lyricsXmlContent = song.lyricsXml.trim();

      // Extract lyrics section if it's a full XML document
      if (lyricsXmlContent.includes('<lyrics')) {
        const lyricsMatch = lyricsXmlContent.match(
          /<lyrics[^>]*>([\s\S]*?)<\/lyrics>/i,
        );
        if (lyricsMatch && lyricsMatch[1]) {
          lyricsXmlContent = lyricsMatch[1].trim();
        }
      }

      // Extract verses from OpenLyrics XML format
      // Match: <verse name="v1"><lines>content</lines></verse>
      // Also handle CDATA: <verse name="v1"><lines><![CDATA[content]]></lines></verse>
      const verseRegex =
        /<verse\s+name=["']([^"']+)["'][^>]*>[\s\S]*?<lines>([\s\S]*?)<\/lines>[\s\S]*?<\/verse>/gi;
      let match;
      let verseOrder = 1;
      while ((match = verseRegex.exec(lyricsXmlContent)) !== null) {
        const name = match[1]; // e.g., "v1", "c1"
        let content = match[2];

        // Handle CDATA
        if (content.includes('<![CDATA[')) {
          const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
          if (cdataMatch) {
            content = cdataMatch[1];
          }
        }

        // Decode XML entities and convert <br /> to newlines
        content = content
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/<br\s*\/?>/gi, '\n')
          .trim();

        parsedVerses.push({
          order: verseOrder++,
          content: content,
          originalLabel: name,
          label: name,
        });
      }
    }

    if (parsedVerses.length === 0) {
      console.warn(
        `[exportServicePlanToOsz] Song ${song.title} (${item.songId}) has no verses - adding empty song`,
      );
      // Add at least one empty slide so the song appears in the export
      slides.push({
        title: song.title,
        raw_slide: '',
        verseTag: 'Z1',
      });
    } else {
      // Parse verseOrder to get correct order of verses
      let orderedVerses: Array<{
        order: number;
        content: string;
        label?: string;
        originalLabel?: string;
      }> = [];

      if (song.verseOrder && song.verseOrder.trim()) {
        // Parse verseOrder string (e.g., "v1 c1 v2 c1 v3 c1")
        const verseOrderParts = song.verseOrder.trim().split(/\s+/);
        const verseMap = new Map<string, (typeof parsedVerses)[0]>();

        // Create map of verses by originalLabel (e.g., "v1", "c1")
        parsedVerses.forEach((verse) => {
          const key = (
            verse.originalLabel ||
            verse.label ||
            `v${verse.order}`
          ).toLowerCase();
          verseMap.set(key, verse);
        });

        // Build ordered verses based on verseOrder
        verseOrderParts.forEach((part, index) => {
          const verse = verseMap.get(part.toLowerCase());
          if (verse) {
            orderedVerses.push({
              ...verse,
              order: index + 1,
            });
          }
        });

        // If verseOrder parsing didn't work, fall back to sorted verses
        if (orderedVerses.length === 0) {
          orderedVerses = [...parsedVerses].sort(
            (a, b) => (a.order || 0) - (b.order || 0),
          );
        }
      } else {
        // No verseOrder, sort by order
        orderedVerses = [...parsedVerses].sort(
          (a, b) => (a.order || 0) - (b.order || 0),
        );
      }

      for (const verse of orderedVerses) {
        // Ensure content exists
        const verseContent = verse.content || '';

        // Extract first line or first few words for title
        const firstLine = verseContent.split('\n')[0] || verseContent;
        const title =
          firstLine.length > 30
            ? firstLine.substring(0, 27) + '...'
            : firstLine;

        // Convert <br/> tags to newlines for raw_slide
        const rawSlide = verseContent.replace(/<br\s*\/?>/gi, '\n');

        // Generate verse tag based on verseOrder position
        // v1, v2, v3 -> Z1, Z2, Z3 (zwrotka)
        // c, c1 -> R1, R2 (refren)
        // b, b1 -> B1, B2 (bridge)
        let verseTag = `Z${verse.order}`;

        if (song.verseOrder && song.verseOrder.trim()) {
          // Extract from verseOrder based on current position in orderedVerses
          const verseOrderParts = song.verseOrder.trim().split(/\s+/);
          const currentIndex = orderedVerses.indexOf(verse);
          if (currentIndex >= 0 && currentIndex < verseOrderParts.length) {
            const part = verseOrderParts[currentIndex];
            const match = part.match(/^([vcbpt])(\d*)$/i);
            if (match) {
              const type = match[1].toLowerCase();
              const num = match[2] || '1';
              // Map: v -> Z, c -> R, b -> B, p -> P, t -> T
              const tagMap: Record<string, string> = {
                v: 'Z',
                c: 'R',
                b: 'B',
                p: 'P',
                t: 'T',
              };
              verseTag = (tagMap[type] || 'Z') + num;
            }
          }
        } else if (verse.originalLabel) {
          // Fallback to originalLabel if verseOrder is not available
          const match = verse.originalLabel.match(/^([vcbpt])(\d*)$/i);
          if (match) {
            const type = match[1].toLowerCase();
            const num = match[2] || '1';
            const tagMap: Record<string, string> = {
              v: 'Z',
              c: 'R',
              b: 'B',
              p: 'P',
              t: 'T',
            };
            verseTag = (tagMap[type] || 'Z') + num;
          }
        }

        slides.push({
          title: title,
          raw_slide: rawSlide,
          verseTag: verseTag,
        });
      }
    }

    // Build serviceitem
    // Note: 'name' in header is the plugin name ('songs'), not the song title
    // Title should include order number (e.g., "1. Ach potrzebuję Cię")
    // Check if title already starts with a number (e.g., "1. Ach potrzebuję Cię")
    const titleAlreadyHasNumber = /^\d+\.\s/.test(song.title);
    const songTitleWithOrder = titleAlreadyHasNumber
      ? song.title
      : `${itemOrder}. ${song.title}`;

    const serviceItem = {
      serviceitem: {
        header: {
          name: 'songs', // Plugin name, not song title
          plugin: 'songs',
          theme: null,
          title: songTitleWithOrder, // Include order number
          footer: [songTitleWithOrder], // Include order number
          type: 1, // 1 = song
          audit: [songTitleWithOrder, [], null, 'None'], // Include order number
          notes: item.notes || '',
          from_plugin: true,
          capabilities: [2, 1, 5, 8, 9, 13, 22], // Standard song capabilities
          search: '', // Empty string as in original example
          data: {
            // Do NOT include id field - original example doesn't have it
            // Title in data should include order number (as in original: "1. ach potrzebuję cię")
            title: songTitleWithOrder.toLowerCase(), // Title WITH order number in data (as in original)
            alternate_title: song.alternateTitle || song.ccliNumber || null,
            // CRITICAL: Use "Nieznany" as default author (as in original example)
            // OpenLP expects a non-empty author string to properly handle author relationships
            authors: song.authors || 'Nieznany',
            ccli_number: song.ccliNumber || null,
            copyright: song.copyright || null,
          },
          xml_version: (() => {
            // CRITICAL: Always generate XML from verses instead of using lyricsXml
            // This ensures we never include <authors> sections that cause OpenLP to try creating author relationships
            // OpenLP tries to create author from <authors> in XML but doesn't set author_type, causing NOT NULL constraint error
            // Even after removing <authors> tags, there might be other author-related content that triggers the issue
            // Generating from verses ensures clean XML without any author information
            return generateXmlFromVerses(song);
          })(),
          auto_play_slides_once: false,
          auto_play_slides_loop: false,
          timed_slide_interval: 0,
          start_time: 0,
          end_time: 0,
          media_length: 0,
          background_audio: [],
          theme_overwritten: false,
          will_auto_start: false,
          processor: null,
          metadata: [],
          sha256_file_hash: null,
          stored_filename: null,
        },
        data: slides,
      },
    };

    serviceData.push(serviceItem);
  }

  // Generate JSON in single line format
  // JSON.stringify automatically escapes Unicode characters (e.g., \u0119 for ę)
  // OpenLP expects standard JSON format with Unicode escape sequences
  // Do NOT manually escape Unicode - let JSON.stringify handle it automatically
  const jsonContent = JSON.stringify(serviceData);

  // Add the JSON file to the archive
  // OpenLP uses service_data.osj as the filename
  archive.append(jsonContent, { name: 'service_data.osj' });

  // Finalize the archive
  archive.finalize();

  return archive;
}

/**
 * Generate OpenLP XML from verses if lyricsXml is not available
 */
function generateXmlFromVerses(song: {
  title: string;
  verses: Array<{
    order: number;
    content: string;
    originalLabel?: string;
  }>;
  verseOrder?: string | null;
  copyright?: string | null;
  authors?: string;
}): string {
  const sortedVerses = [...song.verses].sort((a, b) => a.order - b.order);
  const modifiedDate = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  // Generate XML in single line format (as in original example)
  // CRITICAL: Include <authors> section with "Nieznany" to prevent OpenLP from trying to create author relationship without author_type
  let xml = "<?xml version='1.0' encoding='UTF-8'?>";
  xml +=
    '<song xmlns="http://openlyrics.info/namespace/2009/song" version="0.8"';
  xml += ` createdIn="OpenLP 3.1.7" modifiedIn="OpenLP 3.1.7"`;
  xml += ` modifiedDate="${modifiedDate}">`;
  xml += '<properties>';
  xml += `<titles><title>${escapeXmlForOpenLyrics(song.title)}</title></titles>`;
  // CRITICAL: Include <authors> section with "Nieznany" to ensure OpenLP properly handles author relationships
  // This prevents OpenLP from trying to create author relationship without author_type
  const authors = song.authors || 'Nieznany';
  const authorNames = authors
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
  if (authorNames.length > 0) {
    xml += '<authors>';
    authorNames.forEach((authorName) => {
      xml += `<author>${escapeXmlForOpenLyrics(authorName)}</author>`;
    });
    xml += '</authors>';
  } else {
    // Default to "Nieznany" if no authors specified
    xml += '<authors><author>Nieznany</author></authors>';
  }
  if (song.verseOrder) {
    xml += `<verseOrder>${escapeXmlForOpenLyrics(song.verseOrder)}</verseOrder>`;
  }
  xml += '</properties>';
  xml += '<lyrics>';

  for (const verse of sortedVerses) {
    const label = verse.originalLabel || `v${verse.order}`;
    // Content should have <br/> tags preserved, but escape other XML
    const content = verse.content || '';
    xml += `<verse name="${escapeXmlForOpenLyrics(label)}">`;
    xml += `<lines>${escapeXmlForOpenLyrics(content)}</lines>`;
    xml += '</verse>';
  }

  xml += '</lyrics>';
  xml += '</song>';

  // Return XML in single line format (as in original example)
  return xml;
}

/**
 * Escape XML for OpenLyrics format (preserves <br/> tags)
 * Important: Must escape & first, then < and >, but preserve <br/> tags
 */
function escapeXmlForOpenLyrics(text: string): string {
  if (!text) return '';

  // Step 1: Replace <br/> tags with placeholder (case insensitive, handle variations)
  const brPlaceholder = '___BR_TAG_PLACEHOLDER___';
  const withPlaceholder = text.replace(/<br\s*\/?>/gi, brPlaceholder);

  // Step 2: Escape XML special characters (must escape & first!)
  let escaped = withPlaceholder
    .replace(/&/g, '&amp;') // Must be first!
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Step 3: Restore <br/> tags (now safe because & is already escaped)
  escaped = escaped.replace(new RegExp(brPlaceholder, 'g'), '<br/>');

  return escaped;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
