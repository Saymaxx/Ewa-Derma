import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateClinicSettingsDto {
  @ApiPropertyOptional({ example: 'Ewa Derma Clinic', description: 'Clinic Name' })
  @IsOptional()
  @IsString()
  clinicName?: string;

  @ApiPropertyOptional({ example: '123 Healthcare Ave, Suite 400', description: 'Physical clinic address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+91 9120854977', description: 'Primary contact telephone number' })
  @IsOptional()
  @IsString()
  contactNumber?: string;

  @ApiPropertyOptional({ example: 'contact@ewaderma.com', description: 'Clinic email address' })
  @IsOptional()
  @ValidateIf((o) => o.email !== '' && o.email !== null && o.email !== undefined)
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5', description: 'GST / Tax identification number' })
  @IsOptional()
  @IsString()
  gstNumber?: string;

  @ApiPropertyOptional({ example: 18.0, description: 'Default GST/Tax percentage rate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tax rate must be a valid number' })
  @Min(0, { message: 'Tax rate cannot be negative' })
  @Max(100, { message: 'Tax rate cannot exceed 100%' })
  taxRate?: number;

  @ApiPropertyOptional({ example: '10:00', description: 'Clinic daily opening time (HH:mm)' })
  @IsOptional()
  @IsString()
  openingTime?: string;

  @ApiPropertyOptional({ example: '19:00', description: 'Clinic daily closing time (HH:mm)' })
  @IsOptional()
  @IsString()
  closingTime?: string;

  @ApiPropertyOptional({
    example: 'Mon,Tue,Wed,Thu,Fri,Sat',
    description: 'Comma-separated days of operations',
  })
  @IsOptional()
  @IsString()
  operatingDays?: string;

  @ApiPropertyOptional({ example: 30, description: 'Default appointment slot duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Slot duration must be an integer' })
  @Min(5, { message: 'Slot duration must be at least 5 minutes' })
  @Max(240, { message: 'Slot duration cannot exceed 240 minutes' })
  slotDuration?: number;

  @ApiPropertyOptional({ example: '/uploads/logos/logo.png', description: 'Clinic Logo URL or relative path' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
