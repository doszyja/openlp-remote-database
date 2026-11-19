import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePresentationEventDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openlpSongId?: number;

  @IsOptional()
  @IsString()
  mongoSongId?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  serviceItemTitle?: string;

  @IsOptional()
  @IsDateString()
  presentedAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
