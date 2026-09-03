import { Controller, Get, Query, UseGuards, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppointmentsReportService, UserContext } from './appointments-report.service';
import { PatientsReportService } from './patients-report.service';
import { RevenueReportService } from './revenue-report.service';
import { InventoryReportService } from './inventory-report.service';
import { ReportExporterService } from './report-exporter.service';
import { AppointmentReportQueryDto } from './dto/appointment-report-query.dto';
import { PatientReportQueryDto } from './dto/patient-report-query.dto';
import { RevenueReportQueryDto } from './dto/revenue-report-query.dto';
import { InventoryReportQueryDto } from './dto/inventory-report-query.dto';
import { ExportReportQueryDto } from './dto/export-report-query.dto';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly appointmentsReportService: AppointmentsReportService,
    private readonly patientsReportService: PatientsReportService,
    private readonly revenueReportService: RevenueReportService,
    private readonly inventoryReportService: InventoryReportService,
    private readonly reportExporterService: ReportExporterService,
  ) {}

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
  @ApiOperation({ summary: 'Get appointment analytics report' })
  async getAppointmentReport(@Query() query: AppointmentReportQueryDto, @Req() req: any) {
    const userContext = this.extractUserContext(req);
    const data = await this.appointmentsReportService.generateAppointmentReport(query, userContext);
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  // -------------------------------------------------------------------
  // 2. PATIENT REPORTS DATA
  // -------------------------------------------------------------------
  @Get('patients')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  @ApiOperation({ summary: 'Get patient registration & follow-up report' })
  async getPatientReport(@Query() query: PatientReportQueryDto, @Req() req: any) {
    const userContext = this.extractUserContext(req);
    const data = await this.patientsReportService.generatePatientReport(query, userContext);
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  // -------------------------------------------------------------------
  // 3. REVENUE REPORTS DATA (PHASE 7B)
  // -------------------------------------------------------------------
  @Get('revenue')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Get financial revenue & payments report' })
  async getRevenueReport(@Query() query: RevenueReportQueryDto, @Req() req: any) {
    const userContext = this.extractUserContext(req);
    const data = await this.revenueReportService.generateRevenueReport(query, userContext);
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  // -------------------------------------------------------------------
  // 4. INVENTORY REPORTS DATA (PHASE 7B)
  // -------------------------------------------------------------------
  @Get('inventory')
  @Roles('ADMIN', 'INVENTORY_MANAGER')
  @ApiOperation({ summary: 'Get pharmacy inventory & stock movement report' })
  async getInventoryReport(@Query() query: InventoryReportQueryDto, @Req() req: any) {
    const userContext = this.extractUserContext(req);
    const data = await this.inventoryReportService.generateInventoryReport(query, userContext);
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  // -------------------------------------------------------------------
  // 5. EXPORT APPOINTMENT REPORTS (PDF, CSV, EXCEL)
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
  // 6. EXPORT PATIENT REPORTS (PDF, CSV, EXCEL)
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

  // -------------------------------------------------------------------
  // 7. EXPORT REVENUE REPORTS (PDF, CSV, EXCEL) — PHASE 7B
  // -------------------------------------------------------------------
  @Get('revenue/export')
  @Roles('ADMIN', 'DOCTOR')
  async exportRevenueReport(
    @Query() query: ExportReportQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userContext = this.extractUserContext(req);
    const reportData = await this.revenueReportService.generateRevenueReport(
      { startDate: query.startDate, endDate: query.endDate, doctorId: query.doctorId },
      userContext,
    );
    const { buffer, mimeType, fileName } = await this.reportExporterService.exportRevenueReport(
      reportData,
      query.format,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }

  // -------------------------------------------------------------------
  // 8. EXPORT INVENTORY REPORTS (PDF, CSV, EXCEL) — PHASE 7B
  // -------------------------------------------------------------------
  @Get('inventory/export')
  @Roles('ADMIN', 'INVENTORY_MANAGER')
  async exportInventoryReport(
    @Query() query: ExportReportQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userContext = this.extractUserContext(req);
    const reportData = await this.inventoryReportService.generateInventoryReport(
      { startDate: query.startDate, endDate: query.endDate },
      userContext,
    );
    const { buffer, mimeType, fileName } = await this.reportExporterService.exportInventoryReport(
      reportData,
      query.format,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }
}
