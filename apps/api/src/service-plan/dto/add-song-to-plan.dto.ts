import { IsString, IsOptional, IsNumber } from 'class-validator';

export class AddSongToPlanDto {
  @IsString()
  songId: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
