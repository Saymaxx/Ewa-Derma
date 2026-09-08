import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateDoctorDto } from './create-doctor.dto';
import { IsOptional, IsBoolean, IsString, IsEmail } from 'class-validator';

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {
  @ApiProperty({ example: 'Dr. Rahul', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Sharma', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'dr.rahul@ewaderma.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+91 98765 43210', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

