import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    enum: AppointmentStatus,
    example: AppointmentStatus.CHECKED_IN,
    description: 'Target state in the appointment state machine',
  })
  @IsNotEmpty({ message: 'Target status is required' })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @ApiProperty({ example: 'Patient requested cancellation due to travel', required: false })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiProperty({ example: 'Patient arrived 10 mins early', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
