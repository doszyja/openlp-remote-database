/**
 * Base song type matching MongoDB schema with OpenLP compatibility
 *
 * Note: verses is stored as an array of verse objects (includes chorus, bridge, etc. as verse objects with type labels).
 * The verseOrder string dictates the display sequence and repetitions.
 * The lyricsXml field preserves the exact XML from SQLite for 1:1 transparency.
 */
export interface Song {
  id: string;
  title: string;
  number: string | null; // Maps to OpenLP alternate_title or ccli_number
  language: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  verses: Array<{ order: number; content: string; label?: string; originalLabel?: string }>; // Verses as array (includes chorus, bridge, etc. with type labels)
  versesArray?: Array<{ order: number; content: string; label?: string; originalLabel?: string }>; // Alias for verses (for backward compatibility)
  verseOrder?: string | null; // verse_order string from OpenLP SQLite (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1") - 1:1 transparent with SQLite structure
  lyricsXml?: string | null; // Exact XML from SQLite lyrics column - 1:1 transparent (preserves CDATA, type/label attributes, etc.)
  tags: Tag[];
  // OpenLP compatibility fields
  copyright?: string | null; // OpenLP copyright field
  comments?: string | null; // OpenLP comments field
  ccliNumber?: string | null; // OpenLP ccli_number field
  searchTitle?: string | null; // OpenLP search_title (lowercase title for searching)
  searchLyrics?: string | null; // OpenLP search_lyrics (lowercase lyrics for searching)
}

/**
 * Helper type for frontend: Visual verse representation
 * Used for editing in the UI, but converted to/from single string when saving
 */
export interface VerseDisplay {
  order: number;
  content: string;
  label?: string | null;
}

/**
 * Tag model
 */
export interface Tag {
  id: string;
  name: string;
}

/**
 * OpenLP mapping for sync tracking
 */
export interface OpenLPMapping {
  id: string;
  songId: string;
  openlpId: number | null;
  lastSyncedAt: Date | null;
  syncMetadata: Record<string, unknown> | null;
}
