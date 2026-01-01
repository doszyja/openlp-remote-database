/**
 * Verse DTO for API requests
 */
export interface VerseDto {
    order: number;
    content: string;
    label?: string;
    originalLabel?: string;
}
/**
 * DTO for creating a new song
 */
export interface CreateSongDto {
    title: string;
    number?: string | null;
    language?: string;
    verses: VerseDto[];
    verseOrder?: string | null;
    lyricsXml?: string | null;
    tags?: string[];
    copyright?: string;
    comments?: string;
    ccliNumber?: string;
    searchLyrics?: string;
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
//# sourceMappingURL=create-song.dto.d.ts.map