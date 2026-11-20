import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QuerySpellcheckReportDto {
  @ApiPropertyOptional({
    description: 'MongoDB song id cursor for pagination (exclusive)',
  })
  @IsOptional()
  @IsMongoId()
  cursor?: string;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  batchSize?: number = 12;

  @ApiPropertyOptional({ description: 'Filter by songbook slug' })
  @IsOptional()
  @IsString()
  songbook?: string;

  @ApiPropertyOptional({
    description: 'LanguageTool language code (default pl-PL)',
    example: 'pl-PL',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Running count of songs scanned in previous batches (client-side)',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalScanned?: number = 0;
}