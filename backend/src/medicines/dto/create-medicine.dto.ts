import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateMedicineDto {
  @ApiProperty({ example: 'Tretinoin 0.05% Gel', description: 'Medicine brand or generic display name' })
  @IsNotEmpty({ message: 'Medicine name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Retino-A', required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ example: 'Tretinoin', required: false })
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiProperty({ example: 'cat-uuid-here', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 'Tube', default: 'Tablet' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 280, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ example: 320, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;
}
