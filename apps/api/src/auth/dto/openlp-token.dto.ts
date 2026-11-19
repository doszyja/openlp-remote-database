import { IsNotEmpty, IsString } from 'class-validator';

export class OpenLpTokenDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
