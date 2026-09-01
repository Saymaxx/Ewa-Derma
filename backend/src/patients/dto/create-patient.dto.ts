import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
import { Gender, BloodGroup } from '@prisma/client';

export class CreatePatientDto {
  @ApiProperty({ example: 'Aarav', description: 'Patient first name' })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Gupta', description: 'Patient last name' })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '9876543210', description: 'Primary 10-digit mobile number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^[0-9+ -]{7,15}$/, { message: 'Please provide a valid phone number' })
  phone: string;

  @ApiProperty({ example: 'aarav.gupta@example.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address format' })
  email?: string;

  @ApiProperty({ example: '1995-06-15', required: false, description: 'ISO Date string (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dateOfBirth?: string;

  @ApiProperty({ enum: Gender, default: Gender.NOT_SPECIFIED, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ enum: BloodGroup, default: BloodGroup.UNKNOWN, required: false })
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @ApiProperty({ example: 'Sector B, Golf City, Ansal API', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Lucknow', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Uttar Pradesh', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Father: 9876543211', required: false })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiProperty({ example: 'Mild hypertension, acne breakouts', required: false })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiProperty({ example: 'Sulfa drugs, Salicylic acid sensitivity', required: false })
  @IsOptional()
  @IsString()
  allergies?: string;
}
