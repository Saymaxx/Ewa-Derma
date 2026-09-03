import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreatePaymentDto, recordedByUserId?: string) {
    // 1. Verify invoice exists
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice not found with ID: ${dto.invoiceId}`);
    }

    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.CANCELLED ||
      invoice.status === InvoiceStatus.REFUNDED
    ) {
      throw new BadRequestException(
        `Cannot record payment on invoice ${invoice.invoiceCode} with status ${invoice.status}.`,
      );
    }

    const currentDue = Number(invoice.dueAmount);
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    if (dto.amount > currentDue + 0.01) {
      throw new BadRequestException(
        `Payment amount (₹${dto.amount}) exceeds remaining due amount (₹${currentDue}).`,
      );
    }

    // 2. Record payment
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        status: PaymentStatus.COMPLETED,
        referenceId: dto.referenceId || null,
        notes: dto.notes || null,
        recordedById: recordedByUserId || null,
      },
    });

    // 3. Compute running payment totals server-side
    const allPayments = await this.prisma.payment.findMany({
      where: {
        invoiceId: dto.invoiceId,
        status: PaymentStatus.COMPLETED,
      },
    });

    const totalPaid = allPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    const invoiceTotal = Number(invoice.totalAmount);
    const newDue = Math.max(0, invoiceTotal - totalPaid);

    let newStatus: InvoiceStatus = invoice.status;
    if (totalPaid >= invoiceTotal - 0.01) {
      newStatus = InvoiceStatus.PAID;
    } else if (totalPaid > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }

    // 4. Update invoice paid & due amounts and auto-status
    await this.prisma.invoice.update({
      where: { id: dto.invoiceId },
      data: {
        paidAmount: totalPaid,
        dueAmount: newDue,
        status: newStatus,
      },
    });

    // 5. Audit Log
    if (recordedByUserId) {
      await this.auditLogService.log({
        userId: recordedByUserId,
        action: 'PAYMENT_RECORDED',
        entityName: 'Payment',
        entityId: payment.id,
        details: {
          invoiceId: dto.invoiceId,
          invoiceCode: invoice.invoiceCode,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          newStatus,
          totalPaid,
          newDue,
        },
      });
    }

    return payment;
  }

  async findByInvoiceId(invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoiceId },
      include: {
        recordedBy: {
          select: { firstName: true, lastName: true },
        },
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
