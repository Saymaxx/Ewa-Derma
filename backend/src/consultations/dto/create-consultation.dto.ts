import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiagnosisDto {
  @ApiProperty({ example: 'Acne Vulgaris', description: 'Condition or Disease Name' })
  @IsNotEmpty({ message: 'Condition name is required' })
  @IsString()
  conditionName: string;

  @ApiProperty({ example: 'Moderate', required: false })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiProperty({ example: 'L70.0', required: false })
  @IsOptional()
  @IsString()
  icdCode?: string;

  @ApiProperty({ example: 'Papulopustular lesions on cheeks', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateConsultationDto {
  @ApiProperty({ example: 'appointment-uuid-here', description: 'ID of the appointment' })
  @IsNotEmpty({ message: 'Appointment ID is required' })
  @IsString()
  appointmentId: string;

  @ApiProperty({ example: 'patient-uuid-here', description: 'ID of the patient' })
  @IsNotEmpty({ message: 'Patient ID is required' })
  @IsString()
  patientId: string;

  @ApiProperty({ example: 'Severe facial acne breakouts and erythema', description: 'Chief complaint' })
  @IsNotEmpty({ message: 'Chief complaint is required' })
  @IsString()
  chiefComplaint: string;

  @ApiProperty({ example: 'Burning sensation, itching, skin flaking', required: false })
  @IsOptional()
  @IsString()
  symptoms?: string;

  @ApiProperty({ example: 'Multiple inflammatory papules and comedones on bilateral malar areas', required: false })
  @IsOptional()
  @IsString()
  clinicalFindings?: string;

  @ApiProperty({ example: 'Topical retinoid therapy + Oral antibiotic course for 2 weeks', required: false })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiProperty({
    example: 'Patient is anxious about scarring; monitor closely before starting oral isotretinoin',
    required: false,
    description: 'Private doctor notes - hidden from Reception & Inventory roles',
  })
  @IsOptional()
  @IsString()
  doctorNotes?: string;

  @ApiProperty({ example: '2026-09-15', required: false, description: 'Follow-up date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'Follow up date must be a valid ISO date' })
  followUpDate?: string;

  @ApiProperty({ type: [CreateDiagnosisDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDiagnosisDto)
  diagnoses?: CreateDiagnosisDto[];
}
