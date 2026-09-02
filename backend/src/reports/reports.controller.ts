import { Controller, Get, Query, UseGuards, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppointmentsReportService, UserContext } from './appointments-report.service';
import { PatientsReportService } from './patients-report.service';
import { ReportExporterService } from './report-exporter.service';
import { AppointmentReportQueryDto } from './dto/appointment-report-query.dto';
import { PatientReportQueryDto } from './dto/patient-report-query.dto';
import { ExportReportQueryDto } from './dto/export-report-query.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly appointmentsReportService: AppointmentsReportService, private readonly patientsReportService: PatientsReportService, private readonly reportExporterService: ReportExporterService) {}

  private extractUserContext(req: any): UserContext {
    return {
      userId: req.user.id || req.user.sub,
      roles: req.user.roles || [],
      doctorId: req.user.doctorId || undefined,
    };
  }

  // -------------------------------------------------------------------
  // 1. APPOINTMENT REPORTS DATA
  // -------------------------------------------------------------------
  @Get('appointments')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  async getAppointmentReport(@Query() query: AppointmentReportQueryDto, @Req() req: any) {
    const userContext = this.extractUserContext(req);
    const data = await this.appointmentsReportService.generateAppointmentReport(query, userContext);
    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  // -------------------------------------------------------------------
  // 2. PATIENT REPORTS DATA
  // -------------------------------------------------------------------
  @Get('patients')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  async getPatientReport(@Query() query: PatientReportQueryDto, @Req() req: any) {
    const userContext = this.extractUserContext(req);
    const data = await this.patientsReportService.generatePatientReport(query, userContext);
    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  // -------------------------------------------------------------------
  // 3. EXPORT APPOINTMENT REPORTS (PDF, CSV, EXCEL)
  // -------------------------------------------------------------------
  @Get('appointments/export')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  async exportAppointmentReport(
    @Query() query: ExportReportQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userContext = this.extractUserContext(req);
    const reportData = await this.appointmentsReportService.generateAppointmentReport(query, userContext);
    const { buffer, mimeType, fileName } = await this.reportExporterService.exportAppointmentReport(
      reportData,
      query.format,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }

  // -------------------------------------------------------------------
  // 4. EXPORT PATIENT REPORTS (PDF, CSV, EXCEL)
  // -------------------------------------------------------------------
  @Get('patients/export')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  async exportPatientReport(
    @Query() query: ExportReportQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userContext = this.extractUserContext(req);
    const reportData = await this.patientsReportService.generatePatientReport(query, userContext);
    const { buffer, mimeType, fileName } = await this.reportExporterService.exportPatientReport(
      reportData,
      query.format,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }
}
