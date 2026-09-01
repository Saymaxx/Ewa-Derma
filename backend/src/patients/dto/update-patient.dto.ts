import { PartialType } from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
