import type { VerseDto } from './create-song.dto';

/**
 * DTO for updating a song (all fields optional)
 */
export interface UpdateSongDto {
  title?: string;
  number?: string | null;
  language?: string;
  verses?: VerseDto[]; // Array of verses with order preserved (includes chorus, bridge, etc. as verse objects with type labels)
  verseOrder?: string | null; // verse_order string from OpenLP SQLite (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1")
  tags?: string[];
}

/**
 * @deprecated Use string format for verses instead
 * DTO for updating a verse (kept for backward compatibility)
 */
export interface UpdateVerseDto {
  id?: string;
  order: number;
  content: string;
  label?: string | null;
}
