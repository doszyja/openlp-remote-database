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
  for (const item of sortedItems) {
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

    if (verses.length === 0) {
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
      // Sort verses by order
      const sortedVerses = [...verses].sort(
        (a, b) => (a.order || 0) - (b.order || 0),
      );

      for (const verse of sortedVerses) {
        // Extract first line or first few words for title
        const firstLine = verse.content.split('\n')[0] || verse.content;
        const title =
          firstLine.length > 30
            ? firstLine.substring(0, 27) + '...'
            : firstLine;

        // Convert <br/> tags to newlines for raw_slide
        const rawSlide = verse.content.replace(/<br\s*\/?>/gi, '\n');

        // Generate verse tag (Z1, Z2, etc. for verses, or use originalLabel if available)
        let verseTag = `Z${verse.order}`;
        if (verse.originalLabel) {
          // Map OpenLP labels to verse tags
          // v1, v2, v3 -> Z1, Z2, Z3
          // c, c1 -> C1, C2
          // b, b1 -> B1, B2
          const match = verse.originalLabel.match(/^([vcbpt])(\d*)$/i);
          if (match) {
            const type = match[1].toUpperCase();
            const num = match[2] || '1';
            verseTag = type + num;
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
    const serviceItem = {
      serviceitem: {
        header: {
          name: 'songs', // Plugin name, not song title
          plugin: 'songs',
          theme: null,
          title: song.title,
          footer: [song.title],
          type: 1, // 1 = song
          audit: [song.title, [], null, 'None'],
          notes: item.notes || '',
          from_plugin: true,
          capabilities: [2, 1, 5, 8, 9, 13, 22], // Standard song capabilities
          search: song.title.toLowerCase(),
          data: {
            // OpenLP requires id field - it should be the OpenLP database ID
            // Use openlpId if available (from sync), otherwise null
            // OpenLP will try to find the song by id first, then by title if id is null
            id: song.openlpId || null, // OpenLP database ID (null if song doesn't exist in OpenLP DB)
            title: song.title.toLowerCase(),
            alternate_title: song.alternateTitle || song.ccliNumber || null,
            authors: song.authors || '',
            ccli_number: song.ccliNumber || null,
            copyright: song.copyright || null,
          },
          xml_version: song.lyricsXml || generateXmlFromVerses(song),
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

  // Generate JSON in single line with Unicode escape sequences for non-ASCII characters
  // OpenLP uses compact JSON format with escaped Unicode characters (e.g., \u015b for ś)
  // Use a replacer function to force Unicode escape sequences for all non-ASCII characters
  // This ensures 1:1 compatibility with OpenLP's JSON format
  const jsonContent = JSON.stringify(serviceData, (key, value) => {
    if (typeof value === 'string') {
      // Escape all non-ASCII characters (outside 0x00-0x7F range) as Unicode escape sequences
      // This includes Polish characters like ś (\u015b), ą (\u0105), etc.
      return value.replace(/[\u0080-\uFFFF]/g, (char) => {
        const code = char.charCodeAt(0);
        // Format as \uXXXX with uppercase hex (e.g., \u015b not \u015B)
        return '\\u' + ('0000' + code.toString(16).toLowerCase()).slice(-4);
      });
    }
    return value;
  });

  // Add the JSON file to the archive
  // OpenLP uses the plan name or a generic filename
  archive.append(jsonContent, { name: 'service.osj' });

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
}): string {
  const sortedVerses = [...song.verses].sort((a, b) => a.order - b.order);

  let xml = "<?xml version='1.0' encoding='UTF-8'?>\n";
  xml +=
    '<song xmlns="http://openlyrics.info/namespace/2009/song" version="0.8"';
  xml += ` createdIn="OpenLP Database" modifiedIn="OpenLP Database"`;
  xml += ` modifiedDate="${new Date().toISOString()}">\n`;
  xml += '<properties>\n';
  xml += `<titles><title>${escapeXmlForOpenLyrics(song.title)}</title></titles>\n`;
  if (song.verseOrder) {
    xml += `<verseOrder>${song.verseOrder}</verseOrder>\n`;
  }
  xml += '</properties>\n';
  xml += '<lyrics>\n';

  for (const verse of sortedVerses) {
    const label = verse.originalLabel || `v${verse.order}`;
    // Convert <br/> to proper XML format
    const content = verse.content.replace(/<br\s*\/?>/gi, '<br/>');
    xml += `<verse name="${escapeXmlForOpenLyrics(label)}">\n`;
    xml += `<lines>${escapeXmlForOpenLyrics(content)}</lines>\n`;
    xml += '</verse>\n';
  }

  xml += '</lyrics>\n';
  xml += '</song>';

  return xml;
}

/**
 * Escape XML for OpenLyrics format (preserves <br/> tags)
 */
function escapeXmlForOpenLyrics(text: string): string {
  if (!text) return '';
  // First replace <br/> with placeholder
  const withPlaceholder = text.replace(/<br\s*\/?>/gi, '___BR_TAG___');
  // Escape XML
  const escaped = withPlaceholder
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  // Restore <br/>
  return escaped.replace(/___BR_TAG___/g, '<br/>');
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
