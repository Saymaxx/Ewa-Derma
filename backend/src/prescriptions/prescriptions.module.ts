import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PdfService } from './pdf.service';

@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PdfService],
  exports: [PrescriptionsService, PdfService],
})
export class PrescriptionsModule {}
