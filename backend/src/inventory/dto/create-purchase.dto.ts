import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreatePurchaseDto {
  @ApiProperty({ description: 'Medicine ID', example: 'uuid-medicine-id' })
  @IsNotEmpty()
  @IsString()
  medicineId: string;

  @ApiPropertyOptional({ description: 'Supplier ID', example: 'uuid-supplier-id' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ description: 'Batch Number', example: 'BATCH-2026-09' })
  @IsNotEmpty()
  @IsString()
  batchNumber: string;

  @ApiProperty({ description: 'Quantity received', example: 100 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Purchase Price per unit', example: 150.0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiProperty({ description: 'Batch Expiry Date (YYYY-MM-DD)', example: '2027-12-31' })
  @IsNotEmpty()
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ description: 'Purchase / Invoice Reference Number', example: 'PO-9001' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Purchase notes', example: 'Received 10 boxes from supplier' })
  @IsOptional()
  @IsString()
  notes?: string;
}
