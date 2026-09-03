import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRate?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
