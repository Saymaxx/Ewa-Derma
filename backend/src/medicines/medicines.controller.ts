import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Medicines Formulary & Stock')
@ApiBearerAuth()
@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Search medicines for prescription builder and stock views' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of matching medicines with computed stock' })
  @Get()
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Search medicines for prescription builder and stock views' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of matching medicines with computed stock' })
  async search(@Query('search') search?: string, @Query('limit') limit?: string) {
    return this.medicinesService.search(search, parseInt(limit || '20', 10));
  }

  @Get('categories')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'List all medicine categories' })
  @ApiResponse({ status: 200, description: 'List of medicine categories' })
  async getCategories() {
    return this.medicinesService.getCategories();
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Get single medicine details with active batch stock breakdown' })
  @ApiResponse({ status: 200, description: 'Medicine details retrieved' })
  async findOne(@Param('id') id: string) {
    return this.medicinesService.findOne(id);
  }

  @Get(':id/stock')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Get computed current stock for a medicine across batches' })
  @ApiResponse({ status: 200, description: 'Computed stock breakdown retrieved' })
  async getComputedStock(@Param('id') id: string) {
    return this.medicinesService.getComputedStock(id);
  }

  @Get(':id/transactions')
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Get complete stock movement ledger for audit/investigation' })
  @ApiResponse({ status: 200, description: 'Stock transaction history retrieved' })
  async getTransactions(@Param('id') id: string) {
    return this.medicinesService.getTransactions(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Add a new medicine to the formulary catalog' })
  @ApiResponse({ status: 201, description: 'Medicine added to formulary' })
  async create(@Body() createMedicineDto: CreateMedicineDto) {
    return this.medicinesService.create(createMedicineDto);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Update medicine master details (price, threshold, status)' })
  @ApiResponse({ status: 200, description: 'Medicine updated successfully' })
  async update(@Param('id') id: string, @Body() updateMedicineDto: UpdateMedicineDto) {
    return this.medicinesService.update(id, updateMedicineDto);
  }
}
