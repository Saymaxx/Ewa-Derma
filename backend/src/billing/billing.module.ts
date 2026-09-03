import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  imports: [PrismaModule, CommonModule, AuditLogModule],
  controllers: [
    ServicesController,
    InvoicesController,
    PaymentsController,
    RefundsController,
  ],
  providers: [
    ServicesService,
    InvoicesService,
    PaymentsService,
    RefundsService,
    InvoicePdfService,
  ],
  exports: [
    ServicesService,
    InvoicesService,
    PaymentsService,
    RefundsService,
    InvoicePdfService,
  ],
})
export class BillingModule {}
