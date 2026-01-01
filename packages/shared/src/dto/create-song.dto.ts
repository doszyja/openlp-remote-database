/**
 * Verse DTO for API requests
 */
export interface VerseDto {
  order: number; // verse_order from OpenLP - critical for preserving verse sequence
  content: string; // Verse text content
  label?: string; // Optional label (e.g., "Verse 1", "Bridge", "Pre-Chorus")
  originalLabel?: string; // Original identifier from XML/verse_order (e.g., "v1", "c1", "b1") - used to match verseOrder string
}

/**
 * DTO for creating a new song
 */
export interface CreateSongDto {
  title: string;
  number?: string | null;
  language?: string;
  verses: VerseDto[]; // Array of verses with order preserved (includes chorus, bridge, etc. as verse objects with type labels)
  verseOrder?: string | null; // verse_order string from OpenLP SQLite (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1")
  lyricsXml?: string | null; // Exact XML from SQLite lyrics column - 1:1 transparent with SQLite (preserves CDATA, type/label attributes, etc.)
  tags?: string[];
  // OpenLP compatibility fields
  copyright?: string; // OpenLP copyright field
  comments?: string; // OpenLP comments field
  ccliNumber?: string; // OpenLP ccli_number field
  searchLyrics?: string; // OpenLP search_lyrics field (auto-generated if not provided)
  songbook?: string | null; // Songbook category: 'pielgrzym', 'zielony', 'wedrowiec', 'zborowe'
}

/**
 * @deprecated Use string format for verses instead
 * DTO for creating a verse (kept for backward compatibility)
 */
export interface CreateVerseDto {
  order: number;
  content: string;
  label?: string | null;
}
