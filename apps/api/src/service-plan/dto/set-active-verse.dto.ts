import { IsString, IsInt, Min } from 'class-validator';

export class SetActiveVerseDto {
  @IsString()
  itemId: string;

  @IsInt()
  @Min(0)
  verseIndex: number;
}


