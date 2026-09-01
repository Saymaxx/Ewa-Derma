import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePrescriptionItemDto {
  @ApiProperty({ example: 'med-uuid-here', required: false })
  @IsOptional()
  @IsString()
  medicineId?: string;

  @ApiProperty({ example: 'Tretinoin 0.05% Gel', description: 'Medicine name' })
  @IsNotEmpty({ message: 'Medicine name is required' })
  @IsString()
  medicineName: string;

  @ApiProperty({ example: '0.05%', description: 'Dosage strength' })
  @IsNotEmpty({ message: 'Dosage is required' })
  @IsString()
  dosage: string;

  @ApiProperty({ example: '0-0-1 (Once at Night)', description: 'Frequency instruction' })
  @IsNotEmpty({ message: 'Frequency is required' })
  @IsString()
  frequency: string;

  @ApiProperty({ example: '30 days', description: 'Duration of course' })
  @IsNotEmpty({ message: 'Duration is required' })
  @IsString()
  duration: string;

  @ApiProperty({ example: 'Topical', default: 'Oral' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty({ example: 'Apply pea-sized amount on clean dry skin', required: false })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ example: 'consultation-uuid-here' })
  @IsNotEmpty({ message: 'Consultation ID is required' })
  @IsString()
  consultationId: string;

  @ApiProperty({ example: 'patient-uuid-here' })
  @IsNotEmpty({ message: 'Patient ID is required' })
  @IsString()
  patientId: string;

  @ApiProperty({
    example: 'Avoid direct sunlight, use SPF 50+ sunscreen, wash face with mild foaming cleanser',
    required: false,
  })
  @IsOptional()
  @IsString()
  generalAdvice?: string;

  @ApiProperty({ example: '2026-09-20', required: false, description: 'Follow-up date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'Follow up date must be a valid ISO date' })
  followUpDate?: string;

  @ApiProperty({ type: [CreatePrescriptionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items: CreatePrescriptionItemDto[];
}
