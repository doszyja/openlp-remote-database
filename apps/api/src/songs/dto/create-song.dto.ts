import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VerseDto } from './verse.dto';

export class CreateSongDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  number?: string | null; // Maps to OpenLP alternate_title or ccli_number

  @IsOptional()
  @IsString()
  language?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerseDto)
  verses: VerseDto[]; // Array of verses with order preserved (includes chorus, bridge, etc. as verse objects with type labels)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // Maps to OpenLP theme_name

  // OpenLP compatibility fields
  @IsOptional()
  @IsString()
  copyright?: string; // OpenLP copyright field

  @IsOptional()
  @IsString()
  comments?: string; // OpenLP comments field

  @IsOptional()
  @IsString()
  ccliNumber?: string; // OpenLP ccli_number field

  @IsOptional()
  @IsString()
  searchLyrics?: string; // OpenLP search_lyrics field (auto-generated if not provided)
}
