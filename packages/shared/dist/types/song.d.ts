/**
 * Base song type matching MongoDB schema with OpenLP compatibility
 *
 * Note: verses is stored as an array of verse objects (includes chorus, bridge, etc. as verse objects with type labels).
 * The verseOrder string dictates the display sequence and repetitions.
 * The lyricsXml field preserves the exact XML from SQLite for 1:1 transparency.
 */
export interface Song {
    id: string;
    title: string;
    number: string | null;
    language: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    verses: Array<{
        order: number;
        content: string;
        label?: string;
        originalLabel?: string;
    }>;
    versesArray?: Array<{
        order: number;
        content: string;
        label?: string;
        originalLabel?: string;
    }>;
    verseOrder?: string | null;
    lyricsXml?: string | null;
    tags: Tag[];
    copyright?: string | null;
    comments?: string | null;
    ccliNumber?: string | null;
    searchTitle?: string | null;
    searchLyrics?: string | null;
}
/**
 * Helper type for frontend: Visual verse representation
 * Used for editing in the UI, but converted to/from single string when saving
 */
export interface VerseDisplay {
    order: number;
    content: string;
    label?: string | null;
}
/**
 * Tag model
 */
export interface Tag {
    id: string;
    name: string;
}
/**
 * OpenLP mapping for sync tracking
 */
export interface OpenLPMapping {
    id: string;
    songId: string;
    openlpId: number | null;
    lastSyncedAt: Date | null;
    syncMetadata: Record<string, unknown> | null;
}
//# sourceMappingURL=song.d.ts.map