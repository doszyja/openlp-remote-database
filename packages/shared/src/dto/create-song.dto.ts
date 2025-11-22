/**
 * DTO for creating a new song
 */
export interface CreateSongDto {
  title: string;
  number?: string | null;
  language?: string;
  chorus?: string | null;
  verses: CreateVerseDto[];
  tags?: string[];
}

/**
 * DTO for creating a verse
 */
export interface CreateVerseDto {
  order: number;
  content: string;
  label?: string | null;
}
