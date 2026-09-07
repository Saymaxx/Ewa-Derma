import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Gender, BloodGroup } from '@prisma/client';

export class CreatePatientDto {
  @ApiProperty({ example: 'Aarav', description: 'Patient first name' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Gupta', description: 'Patient last name' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '9876543210', description: 'Primary 10-digit mobile number' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^[0-9+ -]{7,15}$/, { message: 'Please provide a valid phone number' })
  phone: string;

  @ApiProperty({ example: 'aarav.gupta@example.com', required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : (typeof value === 'string' ? value.trim() : value)))
  @ValidateIf((o) => typeof o.email === 'string' && o.email.length > 0)
  @IsEmail({}, { message: 'Invalid email address format' })
  email?: string;

  @ApiProperty({ example: '1995-06-15', required: false, description: 'ISO Date string (YYYY-MM-DD)' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : (typeof value === 'string' ? value.trim() : value)))
  @ValidateIf((o) => typeof o.dateOfBirth === 'string' && o.dateOfBirth.length > 0)
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dateOfBirth?: string;

  @ApiProperty({ enum: Gender, default: Gender.NOT_SPECIFIED, required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o) => o.gender !== undefined && o.gender !== null && o.gender !== '')
  @IsEnum(Gender, { message: 'Gender must be one of: MALE, FEMALE, OTHER, NOT_SPECIFIED' })
  gender?: Gender;

  @ApiProperty({ enum: BloodGroup, default: BloodGroup.UNKNOWN, required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o) => o.bloodGroup !== undefined && o.bloodGroup !== null && o.bloodGroup !== '')
  @IsEnum(BloodGroup, { message: 'Blood group must be a valid blood type' })
  bloodGroup?: BloodGroup;

  @ApiProperty({ example: 'Sector B, Golf City, Ansal API', required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : (typeof value === 'string' ? value.trim() : value)))
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Lucknow', required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : (typeof value === 'string' ? value.trim() : value)))
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Uttar Pradesh', required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : (typeof value === 'string' ? value.trim() : value)))
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Father: 9876543211', required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : (typeof value === 'string' ? value.trim() : value)))
  @IsString()
  emergencyContact?: string;

  @ApiProperty({ example: 'Mild hypertension, acne breakouts', required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : (typeof value === 'string' ? value.trim() : value)))
  @IsString()
  medicalHistory?: string;

  @ApiProperty({ example: 'Sulfa drugs, Salicylic acid sensitivity', required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : (typeof value === 'string' ? value.trim() : value)))
  @IsString()
  allergies?: string;
}
