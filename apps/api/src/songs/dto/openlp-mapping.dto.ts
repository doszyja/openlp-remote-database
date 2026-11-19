import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenLPMappingDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  openlpId?: number;

  @IsOptional()
  @IsString()
  lastSyncedAt?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}
