import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ description: 'Supplier / Pharmaceutical Vendor Name', example: 'Apex Derma Pharma Pvt Ltd' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Contact Person Name', example: 'Rajesh Kumar' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ description: 'Phone Number', example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Email Address', example: 'orders@apexderma.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'GSTIN Registration Number', example: '09AAACA1234A1Z5' })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ description: 'Vendor Address', example: 'Sector 18, Transport Nagar, Lucknow' })
  @IsOptional()
  @IsString()
  address?: string;
}
