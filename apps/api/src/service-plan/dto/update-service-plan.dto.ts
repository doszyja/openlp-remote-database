import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class ServicePlanItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  songId: string;

  @IsString()
  songTitle: string;

  @IsNumber()
  order: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateServicePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePlanItemDto)
  @IsOptional()
  items?: ServicePlanItemDto[];
}

