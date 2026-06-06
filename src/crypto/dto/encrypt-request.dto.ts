import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class EncryptRequestDto {
  @ApiProperty({
    example: 'hello world',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  payload: string;
}
