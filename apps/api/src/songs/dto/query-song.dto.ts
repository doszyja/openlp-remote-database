import { IsOptional, IsString, IsInt, Min, IsArray, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySongDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['title', 'createdAt', 'updatedAt'])
  sortBy?: 'title' | 'createdAt' | 'updatedAt' = 'title';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

