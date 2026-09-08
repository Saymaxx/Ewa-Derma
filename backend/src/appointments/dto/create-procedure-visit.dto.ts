import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateProcedureVisitDto {
  @ApiProperty({ example: 'uuid-patient-id', description: 'Registered Patient UUID' })
  @IsNotEmpty({ message: 'Patient ID is required' })
  @IsString()
  patientId: string;

  @ApiProperty({ example: 'uuid-doctor-id', description: 'Assigned Doctor UUID' })
  @IsNotEmpty({ message: 'Doctor ID is required' })
  @IsString()
  doctorId: string;

  @ApiProperty({ example: 'uuid-procedure-service-id', description: 'Procedure Service ID (from Service catalog)' })
  @IsNotEmpty({ message: 'Procedure Service ID is required' })
  @IsString()
  procedureServiceId: string;

  @ApiPropertyOptional({ example: 'Session 3 for full face laser peel', description: 'Optional procedure notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
