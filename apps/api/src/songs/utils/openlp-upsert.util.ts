import { Types } from 'mongoose';
import { buildSearchTitleFolded } from '@openlp/shared';
import { CreateSongDto } from '../dto/create-song.dto';

/** Matches songstats:remote_id= in OpenLP comments (desktop plugin). */
export function extractSongstatsRemoteId(
  comments?: string | null,
): string | null {
  if (!comments) {
    return null;
  }
  const match = /songstats:remote_id=([^\s\r\n]+)/.exec(comments);
  return match ? match[1].trim() : null;
}

export type OpenlpCreateLookup = {
  byRemoteId?: string;
  byOpenlpId?: number;
  searchTitleFolded?: string;
  number?: string;
};

/**
 * How to find an existing Mongo row when the client POSTs (no PATCH /songs/:id).
 * Production catalogs often have no openlpMapping — use comments + title/number.
 */
export function buildOpenlpCreateLookup(
  dto: CreateSongDto,
): OpenlpCreateLookup {
  const byRemoteId =
    extractSongstatsRemoteId(dto.comments) ?? undefined;
  const byOpenlpId = dto.openlpMapping?.openlpId;
  const title = (dto.title || '').trim();
  const searchTitleFolded = title
    ? buildSearchTitleFolded(title, dto.number ?? null)
    : undefined;
  const number =
    dto.number != null && String(dto.number).trim() !== ''
      ? String(dto.number).trim()
      : undefined;

  return {
    byRemoteId:
      byRemoteId && Types.ObjectId.isValid(byRemoteId)
        ? byRemoteId
        : undefined,
    byOpenlpId,
    searchTitleFolded: searchTitleFolded || undefined,
    number,
  };
}