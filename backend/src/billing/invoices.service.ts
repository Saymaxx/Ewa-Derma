import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { InvoiceStatus } from '@prisma/client';

const VALID_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [
    InvoiceStatus.PENDING,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.PENDING]: [
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.PARTIALLY_PAID]: [
    InvoiceStatus.PAID,
    InvoiceStatus.CANCELLED,
    InvoiceStatus.REFUNDED,
  ],
  [InvoiceStatus.PAID]: [
    InvoiceStatus.REFUNDED,
  ],
  [InvoiceStatus.CANCELLED]: [],
  [InvoiceStatus.REFUNDED]: [],
};

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityIdService: EntityIdService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateInvoiceDto, createdByUserId?: string) {
    // 1. Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient not found with ID: ${dto.patientId}`);
    }

    // 2. Validate discount reason requirement
    const discountAmount = dto.discountAmount || 0;
    if (discountAmount > 0 && (!dto.discountReason || !dto.discountReason.trim())) {
      throw new BadRequestException('A reason/note is required whenever a discount is applied.');
    }

    // 3. Verify items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('An invoice must contain at least one line item.');
    }

    // 4. Calculate line item totals and invoice subtotal
    let subTotal = 0;
    const processedItems = dto.items.map((item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discount || 0;
      const itemTaxRate = item.taxRate || 0;
      const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
      const itemTaxAmount = (taxableAmount * itemTaxRate) / 100;
      const totalPrice = taxableAmount + itemTaxAmount;

      subTotal += itemSubtotal;

      return {
        serviceId: item.serviceId || null,
        medicineId: item.medicineId || null,
        itemType: item.itemType,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: itemDiscount,
        taxRate: itemTaxRate,
        taxAmount: itemTaxAmount,
        totalPrice,
      };
    });

    const invoiceTaxRate = dto.taxRate || 0;
    const netBeforeTax = Math.max(0, subTotal - discountAmount);
    const taxAmount = (netBeforeTax * invoiceTaxRate) / 100;
    const totalAmount = netBeforeTax + taxAmount;

    // 5. Generate INV-5021 code
    const invoiceCode = await this.entityIdService.generateNextId('INV');

    // 6. Save Invoice to Database
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceCode,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId || null,
        consultationId: dto.consultationId || null,
        status: InvoiceStatus.PENDING,
        subTotal,
        discountAmount,
        discountReason: dto.discountReason || null,
        taxRate: invoiceTaxRate,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        notes: dto.notes || null,
        createdById: createdByUserId || null,
        items: {
          create: processedItems,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: true,
      },
    });

    // 7. Write Audit Log
    if (createdByUserId) {
      await this.auditLogService.log({
        userId: createdByUserId,
        action: 'INVOICE_CREATED',
        entityName: 'Invoice',
        entityId: invoice.id,
        details: {
          invoiceCode: invoice.invoiceCode,
          patientId: dto.patientId,
          totalAmount,
          discountAmount,
          discountReason: dto.discountReason,
        },
      });
    }

    return invoice;
  }

  async findAll(query: {
    patientId?: string;
    status?: InvoiceStatus;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};

    if (query.patientId) {
      where.patientId = query.patientId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentCode: true,
            appointmentDate: true,
            doctor: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
        consultation: {
          select: {
            id: true,
            chiefComplaint: true,
            doctor: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        items: {
          include: {
            service: true,
            medicine: true,
          },
        },
        payments: {
          include: {
            recordedBy: {
              select: { firstName: true, lastName: true },
            },
            refunds: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice not found with ID: ${id}`);
    }

    return invoice;
  }

  async updateStatus(id: string, dto: UpdateInvoiceStatusDto, userId?: string) {
    const invoice = await this.findOne(id);
    const allowed = VALID_INVOICE_TRANSITIONS[invoice.status] || [];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${invoice.status} to ${dto.status}.`,
      );
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === InvoiceStatus.CANCELLED
          ? { isVoid: true, voidedAt: new Date(), voidReason: dto.reason }
          : {}),
      },
    });

    if (userId) {
      await this.auditLogService.log({
        userId,
        action: 'INVOICE_STATUS_CHANGED',
        entityName: 'Invoice',
        entityId: id,
        details: {
          fromStatus: invoice.status,
          toStatus: dto.status,
          reason: dto.reason,
        },
      });
    }

    return updated;
  }
}
