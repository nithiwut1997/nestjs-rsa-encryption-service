import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class DecryptRequestDto {
  @ApiProperty({
    example: 'base64-rsa-encrypted-aes-key',
    minLength: 1,
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10000)
  data1: string;

  @ApiProperty({
    example: 'base64-iv:base64-encrypted-payload',
    minLength: 3,
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(10000)
  @Matches(/^[^:]+:[^:]+$/, {
    message: 'data2 must be formatted as iv:encrypted-payload',
  })
  data2: string;
}
