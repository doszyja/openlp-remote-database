/**
 * Base song type matching MongoDB schema with OpenLP compatibility
 *
 * Note: verses is stored as a single string field (matching OpenLP's lyrics format).
 * The frontend can visually split this for editing, but it's stored as one field.
 */
export interface Song {
    id: string;
    title: string;
    number: string | null;
    language: string;
    chorus: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    verses: string;
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