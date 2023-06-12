import { IsString, MinLength } from 'class-validator';

export class messageDto {
  id: string;

  @IsString()
  @MinLength(1)
  message: string;
}
