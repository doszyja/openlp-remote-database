import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBrowserSongViewDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  mongoSongId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  pagePath?: string;

  @IsOptional()
  @IsIn(['detail', 'presentation', 'live', 'list'])
  viewContext?: 'detail' | 'presentation' | 'live' | 'list';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  screenWidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  screenHeight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string;
}
