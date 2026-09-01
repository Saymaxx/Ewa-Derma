import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePrescriptionItemDto } from './create-prescription.dto';

export class CreatePrescriptionVersionDto {
  @ApiProperty({
    example: 'Updated dosage of topical retinoid and added oral antibiotic',
    required: false,
  })
  @IsOptional()
  @IsString()
  generalAdvice?: string;

  @ApiProperty({ example: '2026-09-25', required: false, description: 'Follow-up date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'Follow up date must be a valid ISO date' })
  followUpDate?: string;

  @ApiProperty({ type: [CreatePrescriptionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items: CreatePrescriptionItemDto[];
}
