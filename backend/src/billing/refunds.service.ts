import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateRefundDto, refundedByUserId?: string) {
    // 1. Verify original payment exists
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: {
        invoice: {
          include: { payments: true },
        },
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found with ID: ${dto.paymentId}`);
    }

    const originalAmount = Number(payment.amount);
    const existingRefundTotal = payment.refunds.reduce(
      (acc, r) => acc + Number(r.amount),
      0,
    );
    const maxRefundable = originalAmount - existingRefundTotal;

    if (dto.amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero.');
    }

    if (dto.amount > maxRefundable + 0.01) {
      throw new BadRequestException(
        `Refund amount (₹${dto.amount}) exceeds max refundable amount (₹${maxRefundable}) for this payment.`,
      );
    }

    // 2. Create NEW Refund record (original payment is left untouched)
    const refund = await this.prisma.refund.create({
      data: {
        paymentId: dto.paymentId,
        amount: dto.amount,
        reason: dto.reason,
        referenceId: dto.referenceId || null,
        refundedBy: refundedByUserId || null,
      },
    });

    // Mark payment as refunded if fully refunded
    if (existingRefundTotal + dto.amount >= originalAmount - 0.01) {
      await this.prisma.payment.update({
        where: { id: dto.paymentId },
        data: { isRefunded: true },
      });
    }

    // 3. Recalculate invoice totals & status server-side
    const allPayments = await this.prisma.payment.findMany({
      where: { invoiceId: payment.invoiceId },
      include: { refunds: true },
    });

    let netPaid = 0;
    for (const p of allPayments) {
      const pAmount = Number(p.amount);
      const pRefunds = p.refunds.reduce((acc, r) => acc + Number(r.amount), 0);
      netPaid += Math.max(0, pAmount - pRefunds);
    }

    const invoiceTotal = Number(payment.invoice.totalAmount);
    const newDue = Math.max(0, invoiceTotal - netPaid);

    let newStatus: InvoiceStatus = payment.invoice.status;
    if (netPaid <= 0.01) {
      newStatus = InvoiceStatus.REFUNDED;
    } else if (netPaid < invoiceTotal) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }

    await this.prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        paidAmount: netPaid,
        dueAmount: newDue,
        status: newStatus,
      },
    });

    // 4. Audit Log
    if (refundedByUserId) {
      await this.auditLogService.log({
        userId: refundedByUserId,
        action: 'REFUND_ISSUED',
        entityName: 'Refund',
        entityId: refund.id,
        details: {
          paymentId: dto.paymentId,
          invoiceId: payment.invoiceId,
          invoiceCode: payment.invoice.invoiceCode,
          amount: dto.amount,
          reason: dto.reason,
          newInvoiceStatus: newStatus,
        },
      });
    }

    return refund;
  }
}
