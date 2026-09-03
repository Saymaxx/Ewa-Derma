import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdjustmentsService } from './adjustments.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Inventory Adjustments')
@ApiBearerAuth()
@Controller('inventory/adjustments')
export class AdjustmentsController {
  constructor(private readonly adjustmentsService: AdjustmentsService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'List all manual stock adjustment logs' })
  @ApiResponse({ status: 200, description: 'List of adjustments' })
  async findAll() {
    const items = await this.adjustmentsService.findAll();
    return { message: 'Adjustments retrieved successfully', data: items };
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Record a manual stock adjustment (Requires written reason)' })
  @ApiResponse({ status: 201, description: 'Stock adjustment recorded successfully' })
  async recordAdjustment(@Body() dto: CreateAdjustmentDto, @Req() req: any) {
    const userId = req.user?.userId;
    const item = await this.adjustmentsService.recordAdjustment(dto, userId);
    return { message: 'Stock adjustment recorded successfully', data: item };
  }
}
