import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateWalkInVisitDto {
  @ApiProperty({ example: 'uuid-patient-id', description: 'Registered Patient UUID' })
  @IsNotEmpty({ message: 'Patient ID is required' })
  @IsString()
  patientId: string;

  @ApiProperty({ example: 'uuid-doctor-id', description: 'Assigned Doctor UUID' })
  @IsNotEmpty({ message: 'Doctor ID is required' })
  @IsString()
  doctorId: string;

  @ApiPropertyOptional({ example: 'uuid-service-id', description: 'Service ID (from Service catalog - consultation or procedure)' })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiPropertyOptional({ example: 'uuid-service-id', description: 'Legacy alias for procedure service ID' })
  @IsOptional()
  @IsString()
  procedureServiceId?: string;

  @ApiPropertyOptional({ example: 'Walk-in consultation for acute skin flare-up', description: 'Optional visit / procedure notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
