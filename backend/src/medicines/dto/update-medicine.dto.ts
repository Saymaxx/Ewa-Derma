import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, Min } from 'class-validator';

export class UpdateMedicineDto {
  @ApiPropertyOptional({ description: 'Medicine Name', example: 'Tretinoin 0.05% Gel' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Brand Name', example: 'Retin-A' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Generic Name', example: 'Tretinoin' })
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiPropertyOptional({ description: 'Category ID', example: 'uuid-category-id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Unit type', example: 'Tube' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Selling Unit Price', example: 250.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum Retail Price (MRP)', example: 280.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @ApiPropertyOptional({ description: 'Purchase Price per unit', example: 120.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'Minimum stock threshold for alerts', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @ApiPropertyOptional({ description: 'GST rate percentage', example: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @ApiPropertyOptional({ description: 'Is medicine active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
