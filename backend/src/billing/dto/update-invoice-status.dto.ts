import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus)
  @IsNotEmpty()
  status: InvoiceStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}
