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
  verses: string | null;
  versesArray?: Array<{ order: number; content: string; label?: string; originalLabel?: string }>; // Verses as array with originalLabel for frontend logic
  verseOrder?: string | null; // verse_order string from OpenLP SQLite (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1") - 1:1 transparent with SQLite structure
  lyricsXml?: string | null; // Exact XML from SQLite lyrics column - 1:1 transparent (preserves CDATA, type/label attributes, etc.)
  searchTitle: string | null; // For search
  searchLyrics: string | null; // For search in lyrics
}