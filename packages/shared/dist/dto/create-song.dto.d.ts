/**
 * DTO for creating a new song
 */
export interface CreateSongDto {
    title: string;
    number?: string | null;
    language?: string;
    verses: string;
    verseOrder?: string | null;
    tags?: string[];
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