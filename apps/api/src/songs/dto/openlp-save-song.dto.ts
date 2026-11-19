import { IsOptional, IsString } from 'class-validator';
import { CreateSongDto } from './create-song.dto';

/**
 * OpenLP desktop save: optional Mongo id; server upserts by id, comments, or title/number.
 */
export class OpenLpSaveSongDto extends CreateSongDto {
  @IsOptional()
  @IsString()
  id?: string;
}