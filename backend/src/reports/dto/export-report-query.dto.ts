import { IsNotEmpty, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class ExportReportQueryDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['pdf', 'csv', 'excel'])
  format: 'pdf' | 'csv' | 'excel';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
