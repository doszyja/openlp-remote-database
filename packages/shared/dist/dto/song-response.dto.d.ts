import type { Song, Tag } from '../types';
/**
 * Response DTO for a single song
 */
export interface SongResponseDto extends Song {
}
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
export interface SongListCacheOpenLPMapping {
    openlpId?: number | null;
    lastSyncedAt?: string | null;
    clientId?: string | null;
}
export interface SongListCacheItem {
    id: string;
    title: string;
    number: string | null;
    language: string;
    tags: Tag[];
    verses: string | null;
    versesArray?: Array<{
        order: number;
        content: string;
        label?: string;
        originalLabel?: string;
    }>;
    verseOrder?: string | null;
    lyricsXml?: string | null;
    searchTitle: string | null;
    searchLyrics: string | null;
    songbook?: string | null;
    copyright?: string | null;
    comments?: string | null;
    ccliNumber?: string | null;
    openlpMapping?: SongListCacheOpenLPMapping | null;
    updatedAt?: string | null;
}
/** GET /songs/all-openlp — lyricsXml is full OpenLP SQLite `songs.lyrics` document. */
export type SongListOpenlpCacheItem = SongListCacheItem;
//# sourceMappingURL=song-response.dto.d.ts.map