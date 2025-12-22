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
}

