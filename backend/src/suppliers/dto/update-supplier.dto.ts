import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional({ description: 'Is supplier active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
