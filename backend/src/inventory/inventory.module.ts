import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { AdjustmentsService } from './adjustments.service';
import { AdjustmentsController } from './adjustments.controller';
import { DispensingService } from './dispensing.service';
import { DispensingController } from './dispensing.controller';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';

@Module({
  providers: [PurchasesService, AdjustmentsService, DispensingService, AlertsService],
  controllers: [
    PurchasesController,
    AdjustmentsController,
    DispensingController,
    AlertsController,
  ],
  exports: [PurchasesService, AdjustmentsService, DispensingService, AlertsService],
})
export class InventoryModule {}
