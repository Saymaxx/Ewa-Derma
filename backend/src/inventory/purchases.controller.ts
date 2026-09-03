import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Inventory Purchases')
@ApiBearerAuth()
@Controller('inventory/purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'List all stock purchase transactions' })
  @ApiResponse({ status: 200, description: 'List of purchases' })
  async findAll() {
    const items = await this.purchasesService.findAll();
    return { message: 'Purchases retrieved successfully', data: items };
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Record a new stock purchase entry (Stock IN)' })
  @ApiResponse({ status: 201, description: 'Purchase recorded and batch stock updated' })
  async recordPurchase(@Body() dto: CreatePurchaseDto, @Req() req: any) {
    const userId = req.user?.userId;
    const item = await this.purchasesService.recordPurchase(dto, userId);
    return { message: 'Stock purchase recorded successfully', data: item };
  }
}
