import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Inventory Alerts')
@ApiBearerAuth()
@Controller('inventory/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER, RoleName.RECEPTIONIST, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Get computed low-stock and expiry alerts for dashboard cards' })
  @ApiResponse({ status: 200, description: 'Inventory alerts breakdown retrieved' })
  async getInventoryAlerts() {
    return this.alertsService.getInventoryAlerts();
  }
}
