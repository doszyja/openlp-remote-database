import { IsBooleanString, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPresentationEventsDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  mongoSongId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(['openlp', 'browser'])
  source?: 'openlp' | 'browser';

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsString()
  viewContext?: string;

  @IsOptional()
  @IsBooleanString()
  authenticated?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class QueryPresentationSummaryDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @Type(() => Number)
  days?: number;

  @IsOptional()
  @IsIn(['openlp', 'browser'])
  source?: 'openlp' | 'browser';

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsIn(['song', 'day', 'source', 'device'])
  groupBy?: 'song' | 'day' | 'source' | 'device';
}