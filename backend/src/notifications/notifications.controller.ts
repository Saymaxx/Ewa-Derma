import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RemindersService } from './reminders.service';
import { NotificationTemplates } from './templates/notification.templates';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../prescriptions/pdf.service';
import { InvoicePdfService } from '../billing/invoice-pdf.service';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName, NotificationChannel, NotificationType, NotificationStatus } from '@prisma/client';
import { IsOptional, IsEnum, IsString } from 'class-validator';

export class SendNotificationRequestDto {
  @ApiPropertyOptional({ enum: NotificationChannel, example: NotificationChannel.EMAIL })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ description: 'Custom override recipient email or phone' })
  @IsOptional()
  @IsString()
  recipient?: string;
}

@ApiTags('Notifications & Communication')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly remindersService: RemindersService,
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly prescriptionsService: PrescriptionsService,
  ) {}

  @Post('send-invoice/:invoiceId')
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Send invoice PDF to patient via Email or WhatsApp' })
  @ApiResponse({ status: 200, description: 'Invoice notification dispatch result' })
  async sendInvoice(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: SendNotificationRequestDto,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, patientCode: true, address: true } },
        items: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice not found with ID: ${invoiceId}`);
    }

    const channel = dto.channel || NotificationChannel.EMAIL;
    const recipient =
      dto.recipient?.trim() ||
      (channel === NotificationChannel.EMAIL ? invoice.patient.email : invoice.patient.phone);

    if (!recipient) {
      throw new BadRequestException(
        `Patient ${invoice.patient.firstName} ${invoice.patient.lastName} has no ${channel.toLowerCase()} configured`,
      );
    }

    const clinic = await this.prisma.clinicSetting.findFirst();

    // Render Invoice PDF buffer (reusing Phase 4 PDF generation logic)
    const pdfUint8 = await this.invoicePdfService.generateInvoicePdf({
      clinicName: clinic?.clinicName || 'EWA DERMA CLINIC',
      clinicAddress: clinic?.address || '6th Floor, The Millennium Place, Golf City, Lucknow',
      clinicPhone: clinic?.contactNumber || '0120-5244840',
      clinicGst: clinic?.gstNumber || undefined,
      invoiceCode: invoice.invoiceCode,
      date: invoice.createdAt.toISOString().split('T')[0],
      status: invoice.status,
      patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
      patientCode: invoice.patient.patientCode,
      patientPhone: invoice.patient.phone,
      patientAddress: invoice.patient.address || undefined,
      items: invoice.items.map((item) => ({
        description: item.description,
        itemType: item.itemType,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        totalPrice: Number(item.totalPrice),
      })),
      subTotal: Number(invoice.subTotal),
      discountAmount: Number(invoice.discountAmount),
      discountReason: invoice.discountReason || undefined,
      taxRate: Number(invoice.taxRate),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      dueAmount: Number(invoice.dueAmount),
      payments: invoice.payments.map((p) => ({
        amount: Number(p.amount),
        method: p.paymentMethod,
        date: p.createdAt.toISOString().split('T')[0],
        ref: p.referenceId || undefined,
      })),
    });

    const template = NotificationTemplates.invoiceSent({
      patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
      invoiceCode: invoice.invoiceCode,
      totalAmount: Number(invoice.totalAmount).toFixed(2),
    });

    const result = await this.notificationsService.dispatch({
      channel,
      type: NotificationType.INVOICE_SENT,
      recipient,
      templateName: 'invoiceSent',
      subject: template.subject,
      content: template.content,
      relatedEntity: 'INVOICE',
      relatedEntityId: invoice.id,
      pdfBuffer: Buffer.from(pdfUint8),
      pdfFilename: `${invoice.invoiceCode}.pdf`,
    });

    return result;
  }

  @Post('send-prescription/:prescriptionId')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Send prescription PDF to patient via Email or WhatsApp' })
  @ApiResponse({ status: 200, description: 'Prescription notification dispatch result' })
  async sendPrescription(
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: SendNotificationRequestDto,
  ) {
    const rxPdf = await this.prescriptionsService.generatePdf(prescriptionId);

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        doctor: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription not found with ID: ${prescriptionId}`);
    }

    const channel = dto.channel || NotificationChannel.EMAIL;
    const recipient =
      dto.recipient?.trim() ||
      (channel === NotificationChannel.EMAIL ? prescription.patient.email : prescription.patient.phone);

    if (!recipient) {
      throw new BadRequestException(
        `Patient ${prescription.patient.firstName} ${prescription.patient.lastName} has no ${channel.toLowerCase()} configured`,
      );
    }

    const docName = prescription.doctor?.user
      ? `${prescription.doctor.user.firstName} ${prescription.doctor.user.lastName}`
      : 'Attending Dermatologist';

    const template = NotificationTemplates.prescriptionSent({
      patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
      doctorName: docName,
      prescriptionCode: prescription.prescriptionCode,
    });

    const result = await this.notificationsService.dispatch({
      channel,
      type: NotificationType.PRESCRIPTION_SENT,
      recipient,
      templateName: 'prescriptionSent',
      subject: template.subject,
      content: template.content,
      relatedEntity: 'PRESCRIPTION',
      relatedEntityId: prescription.id,
      pdfBuffer: Buffer.from(rxPdf.buffer),
      pdfFilename: rxPdf.filename,
    });

    return result;
  }

  @Post('run-reminders')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Manually trigger appointment reminders job for upcoming visits' })
  @ApiResponse({ status: 200, description: 'Reminders job execution summary' })
  async runReminders() {
    return this.remindersService.processAppointmentReminders();
  }

  @Get('history/:entityType/:entityId')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST, RoleName.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Get notification send history for a specific invoice/prescription/appointment' })
  @ApiResponse({ status: 200, description: 'Notification attempt history' })
  async getHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.notificationsService.getHistory(entityType, entityId);
  }

  @Get()
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin Notification Log dashboard' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'channel', required: false, enum: NotificationChannel })
  @ApiResponse({ status: 200, description: 'List of notification attempt records' })
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: NotificationStatus,
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel,
    @Query('limit') limit?: string,
  ) {
    const safeLimit = Math.min(Math.max(1, parseInt(limit || '50', 10) || 50), 100);
    return this.notificationsService.findAll(
      search,
      status,
      type,
      channel,
      safeLimit,
    );
  }
}
