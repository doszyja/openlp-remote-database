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
  @IsString()
  verseOrder?: string | null; // verse_order string from OpenLP SQLite (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1")

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

  @IsOptional()
  @IsString()
  lyricsXml?: string | null; // Exact XML from SQLite lyrics column - 1:1 transparent with SQLite (preserves CDATA, type/label attributes, etc.)

  @IsOptional()
  @IsString()
  songbook?: string | null; // Songbook category: 'pielgrzym', 'zielony', 'wedrowiec', 'zborowe'
}
