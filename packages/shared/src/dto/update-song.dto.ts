/**
 * DTO for updating a song (all fields optional)
 */
export interface UpdateSongDto {
  title?: string;
  number?: string | null;
  language?: string;
  chorus?: string | null;
  verses?: UpdateVerseDto[];
  tags?: string[];
}

/**
 * DTO for updating a verse
 */
export interface UpdateVerseDto {
  id?: string;
  order: number;
  content: string;
  label?: string | null;
}
