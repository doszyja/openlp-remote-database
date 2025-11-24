import { IsString, IsOptional, IsArray, IsNotEmpty, MinLength } from 'class-validator';

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

  @IsOptional()
  @IsString()
  chorus?: string | null;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  verses: string; // All verses as single string (frontend can split visually for editing)

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

