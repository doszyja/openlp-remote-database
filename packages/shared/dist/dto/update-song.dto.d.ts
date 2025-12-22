/**
 * DTO for updating a song (all fields optional)
 */
export interface UpdateSongDto {
    title?: string;
    number?: string | null;
    language?: string;
    verses?: string;
    verseOrder?: string | null;
    tags?: string[];
}
/**
 * @deprecated Use string format for verses instead
 * DTO for updating a verse (kept for backward compatibility)
 */
export interface UpdateVerseDto {
    id?: string;
    order: number;
    content: string;
    label?: string | null;
}
//# sourceMappingURL=update-song.dto.d.ts.map