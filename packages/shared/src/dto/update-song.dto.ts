/**
 * DTO for updating a song (all fields optional)
 */
export interface UpdateSongDto {
  title?: string;
  number?: string | null;
  language?: string;
  chorus?: string | null;
  verses?: string; // All verses as single string (frontend can split visually for editing)
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
