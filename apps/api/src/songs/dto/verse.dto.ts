import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class VerseDto {
  @IsNumber()
  @Min(0)
  order: number; // verse_order from OpenLP - critical for preserving verse sequence

  @IsString()
  content: string; // Verse text content

  @IsOptional()
  @IsString()
  label?: string; // Optional label (e.g., "Verse 1", "Bridge", "Pre-Chorus")

  @IsOptional()
  @IsString()
  originalLabel?: string; // Original identifier from XML/verse_order (e.g., "v1", "c1", "b1") - used to match verseOrder string
}
