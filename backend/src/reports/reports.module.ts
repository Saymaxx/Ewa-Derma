import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { AppointmentsReportService } from './appointments-report.service';
import { PatientsReportService } from './patients-report.service';
import { ReportExporterService } from './report-exporter.service';

@Module({
  controllers: [ReportsController],
  providers: [
    AppointmentsReportService,
    PatientsReportService,
    ReportExporterService,
  ],
  exports: [
    AppointmentsReportService,
    PatientsReportService,
    ReportExporterService,
  ],
})
export class ReportsModule {}
