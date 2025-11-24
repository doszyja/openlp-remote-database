/**
 * DTO for creating a new song
 */
export interface CreateSongDto {
  title: string;
  number?: string | null;
  language?: string;
  chorus?: string | null;
  verses: string; // All verses as single string (frontend can split visually for editing)
  tags?: string[];
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
