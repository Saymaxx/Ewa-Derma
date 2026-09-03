import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RemindersService } from './reminders.service';
import { EmailAdapter } from './adapters/email.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { NotificationsController } from './notifications.controller';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { InvoicePdfService } from '../billing/invoice-pdf.service';

@Module({
  imports: [PrescriptionsModule],
  providers: [
    NotificationsService,
    RemindersService,
    EmailAdapter,
    WhatsAppAdapter,
    InvoicePdfService,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, RemindersService],
})
export class NotificationsModule {}
