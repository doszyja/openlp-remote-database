/**
 * Base song type matching Prisma schema
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
    verses: Verse[];
    tags: Tag[];
}
/**
 * Verse model
 */
export interface Verse {
    id: string;
    songId: string;
    order: number;
    content: string;
    label: string | null;
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