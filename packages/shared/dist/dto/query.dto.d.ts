/**
 * Query parameters for listing/searching songs
 */
export interface SongQueryDto {
    page?: number;
    limit?: number;
    language?: string;
    tags?: string[];
    search?: string;
    sortBy?: 'title' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
}
//# sourceMappingURL=query.dto.d.ts.map