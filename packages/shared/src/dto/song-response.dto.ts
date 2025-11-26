import type { Song, Tag } from '../types';

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

/**
 * Lightweight song list item for caching (minimal fields for search and display)
 */
export interface SongListCacheItem {
  id: string;
  title: string;
  number: string | null;
  language: string;
  tags: Tag[];
  chorus: string | null;
  verses: string | null;
  searchTitle: string | null; // For search
  searchLyrics: string | null; // For search in lyrics
}