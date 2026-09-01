import { PartialType } from '@nestjs/swagger';
import { CreateDoctorDto } from './create-doctor.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
