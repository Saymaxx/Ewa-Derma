import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@ewaderma.com',
    description: 'User email or username',
  })
  @IsNotEmpty({ message: 'Email or username is required' })
  @IsString()
  identifier: string;

  @ApiProperty({
    example: 'Clinic@12345',
    description: 'User password',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
