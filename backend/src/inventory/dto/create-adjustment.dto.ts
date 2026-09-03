import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { InventoryTransactionType } from '@prisma/client';

export class CreateAdjustmentDto {
  @ApiProperty({ description: 'Medicine ID', example: 'uuid-medicine-id' })
  @IsNotEmpty()
  @IsString()
  medicineId: string;

  @ApiPropertyOptional({ description: 'Batch ID', example: 'uuid-batch-id' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty({
    description: 'Transaction Type',
    enum: [
      InventoryTransactionType.ADJUSTMENT_IN,
      InventoryTransactionType.ADJUSTMENT_OUT,
      InventoryTransactionType.EXPIRED_OUT,
      InventoryTransactionType.DAMAGED_OUT,
    ],
    example: InventoryTransactionType.DAMAGED_OUT,
  })
  @IsNotEmpty()
  @IsEnum(InventoryTransactionType)
  transactionType: InventoryTransactionType;

  @ApiProperty({ description: 'Quantity (positive number, sign will be auto-calculated)', example: 5 })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Mandatory Reason / Audit Note for adjustment', example: 'Broken vial during storage relocation' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
