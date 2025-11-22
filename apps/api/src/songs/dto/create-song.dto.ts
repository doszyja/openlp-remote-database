import { IsString, IsOptional, IsArray, ValidateNested, IsNotEmpty, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVerseDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  label?: string | null;

  order: number;
}

export class CreateSongDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  number?: string | null;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  chorus?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVerseDto)
  verses: CreateVerseDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

