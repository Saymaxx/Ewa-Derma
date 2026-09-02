import { IsOptional, IsString, IsDateString } from 'class-validator';

export class PatientReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  doctorId?: string;
}
