import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceItemDto {
  @IsString()
  @IsIn(['SERVICE', 'MEDICINE'])
  itemType: 'SERVICE' | 'MEDICINE';

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  medicineId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRate?: number;
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;

  @IsString()
  @IsOptional()
  consultationId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @IsString()
  @IsOptional()
  discountReason?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRate?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
