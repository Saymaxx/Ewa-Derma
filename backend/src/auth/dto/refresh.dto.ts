import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Valid refresh token provided upon login',
  })
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString()
  refreshToken: string;
}
