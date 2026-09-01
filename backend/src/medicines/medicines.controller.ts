import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Medicines Formulary')
@ApiBearerAuth()
@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Search medicines for prescription builder (debounced)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of matching medicines' })
  async search(@Query('search') search?: string, @Query('limit') limit?: string) {
    return this.medicinesService.search(search, parseInt(limit || '20', 10));
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Get single medicine details' })
  @ApiResponse({ status: 200, description: 'Medicine details retrieved' })
  async findOne(@Param('id') id: string) {
    return this.medicinesService.findOne(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Add a new medicine to the formulary catalog' })
  @ApiResponse({ status: 201, description: 'Medicine added to formulary' })
  async create(@Body() createMedicineDto: CreateMedicineDto) {
    return this.medicinesService.create(createMedicineDto);
  }
}
