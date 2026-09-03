import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { AppointmentsReportService } from './appointments-report.service';
import { PatientsReportService } from './patients-report.service';
import { RevenueReportService } from './revenue-report.service';
import { InventoryReportService } from './inventory-report.service';
import { ReportExporterService } from './report-exporter.service';

@Module({
  controllers: [ReportsController],
  providers: [
    AppointmentsReportService,
    PatientsReportService,
    RevenueReportService,
    InventoryReportService,
    ReportExporterService,
  ],
  exports: [
    AppointmentsReportService,
    PatientsReportService,
    RevenueReportService,
    InventoryReportService,
    ReportExporterService,
  ],
})
export class ReportsModule {}
