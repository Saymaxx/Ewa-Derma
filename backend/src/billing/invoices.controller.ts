import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { InvoiceStatus } from '@prisma/client';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles('ADMIN', 'RECEPTIONIST')
  async findAll(
    @Query('patientId') patientId?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.invoicesService.findAll({
      patientId,
      status,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  async findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'RECEPTIONIST')
  async create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.invoicesService.create(dto, userId);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'RECEPTIONIST')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.invoicesService.updateStatus(id, dto, userId);
  }

  @Get(':id/pdf')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  async generatePdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoicesService.findOne(id);
    const clinic = await this.prisma.clinicSetting.findFirst();

    const pdfBuffer = await this.invoicePdfService.generateInvoicePdf({
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${invoice.invoiceCode}.pdf"`,
    );
    res.send(Buffer.from(pdfBuffer));
  }
}
