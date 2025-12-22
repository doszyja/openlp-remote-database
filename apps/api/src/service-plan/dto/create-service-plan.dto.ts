import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class ServicePlanItemDto {
  @IsString()
  songId: string;

  @IsString()
  songTitle: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  activeVerseIndex?: number;
}

export class CreateServicePlanDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePlanItemDto)
  @IsOptional()
  items?: ServicePlanItemDto[];
}

