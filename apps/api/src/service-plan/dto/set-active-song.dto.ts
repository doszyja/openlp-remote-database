import { IsString, IsBoolean } from 'class-validator';

export class SetActiveSongDto {
  @IsString()
  itemId: string;

  @IsBoolean()
  isActive: boolean;
}

