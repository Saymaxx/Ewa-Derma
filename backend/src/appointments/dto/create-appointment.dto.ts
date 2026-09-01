import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  Matches,
} from 'class-validator';
import { AppointmentType } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'patient-uuid', description: 'Patient UUID' })
  @IsNotEmpty({ message: 'Patient ID is required' })
  @IsString()
  patientId: string;

  @ApiProperty({ example: 'doctor-uuid', description: 'Doctor UUID' })
  @IsNotEmpty({ message: 'Doctor ID is required' })
  @IsString()
  doctorId: string;

  @ApiProperty({ example: '2026-09-02', description: 'Date of appointment (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Appointment date is required' })
  @IsDateString({}, { message: 'Appointment date must be a valid ISO date' })
  appointmentDate: string;

  @ApiProperty({ example: '10:00', description: 'Start time (HH:mm)' })
  @IsNotEmpty({ message: 'Start time is required' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Start time must be in HH:mm format' })
  startTime: string;

  @ApiProperty({ example: '10:30', description: 'End time (HH:mm)' })
  @IsNotEmpty({ message: 'End time is required' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'End time must be in HH:mm format' })
  endTime: string;

  @ApiProperty({ enum: AppointmentType, default: AppointmentType.CONSULTATION })
  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @ApiProperty({ example: 'Skin rash and acne consultation', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ example: 'Patient prefers morning appointments', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: false, default: false, description: 'True if direct walk-in registration' })
  @IsOptional()
  @IsBoolean()
  isWalkIn?: boolean;
}
