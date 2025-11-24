import type { Song } from '../types';

/**
 * Response DTO for a single song
 */
export interface SongResponseDto extends Song {}

/**
 * Response DTO for song list item (simplified)
 */
export interface SongListItemDto {
  id: string;
  title: string;
  number: string | null;
  language: string;
  tags: string[];
  verseCount: number;
  createdAt: Date;
  updatedAt: Date;
}
