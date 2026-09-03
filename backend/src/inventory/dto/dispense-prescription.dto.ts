import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString } from 'class-validator';

export class DispensePrescriptionDto {
  @ApiPropertyOptional({
    description: 'Specific PrescriptionItem IDs to dispense (if empty, dispenses all items in prescription)',
    example: ['item-uuid-1', 'item-uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];
}
