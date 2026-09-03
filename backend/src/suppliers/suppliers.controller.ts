import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Suppliers & Vendors')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'List all pharmaceutical suppliers/vendors' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of suppliers' })
  async findAll(@Query('search') search?: string, @Query('activeOnly') activeOnly?: string) {
    const isOnlyActive = activeOnly === 'true';
    const items = await this.suppliersService.findAll(search, isOnlyActive);
    return { message: 'Suppliers retrieved successfully', data: items };
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Get details of a single supplier' })
  @ApiResponse({ status: 200, description: 'Supplier details retrieved' })
  async findOne(@Param('id') id: string) {
    const item = await this.suppliersService.findOne(id);
    return { message: 'Supplier details retrieved', data: item };
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Create a new supplier record' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  async create(@Body() dto: CreateSupplierDto) {
    const item = await this.suppliersService.create(dto);
    return { message: 'Supplier created successfully', data: item };
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Update an existing supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    const item = await this.suppliersService.update(id, dto);
    return { message: 'Supplier updated successfully', data: item };
  }
}
