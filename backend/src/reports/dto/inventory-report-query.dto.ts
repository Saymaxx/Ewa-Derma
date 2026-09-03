import { IsOptional, IsString, IsDateString } from 'class-validator';

export class InventoryReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  medicineId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
