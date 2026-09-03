import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';
import { RefundsService } from './refunds.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

describe('Billing & Payments Module Services', () => {
  let invoicesService: InvoicesService;
  let paymentsService: PaymentsService;
  let refundsService: RefundsService;

  const mockPrismaService = {
    patient: {
      findUnique: jest.fn(),
    },
    service: {
      count: jest.fn().mockResolvedValue(6),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    servicePrice: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refund: {
      create: jest.fn(),
    },
  };

  const mockEntityIdService = {
    generateNextId: jest.fn().mockResolvedValue('INV-5001'),
  };

  const mockAuditLogService = {
    log: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        PaymentsService,
        RefundsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EntityIdService, useValue: mockEntityIdService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    invoicesService = module.get<InvoicesService>(InvoicesService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    refundsService = module.get<RefundsService>(RefundsService);

    jest.clearAllMocks();
  });

  describe('InvoicesService', () => {
    it('should throw BadRequestException if discount > 0 without discountReason', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValue({ id: 'p-1' });

      await expect(
        invoicesService.create({
          patientId: 'p-1',
          discountAmount: 100,
          discountReason: '',
          items: [{ itemType: 'SERVICE', description: 'Consultation', quantity: 1, unitPrice: 500 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should correctly calculate subtotal, discount, tax, and total amount', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValue({ id: 'p-1' });
      mockPrismaService.invoice.create.mockImplementation((args) => Promise.resolve({ id: 'inv-1', ...args.data }));

      const result = await invoicesService.create({
        patientId: 'p-1',
        discountAmount: 500,
        discountReason: 'Festival Offer',
        taxRate: 0,
        items: [
          { itemType: 'SERVICE', description: 'Laser Hair Reduction', quantity: 1, unitPrice: 3000 },
          { itemType: 'MEDICINE', description: 'Tretinoin Gel', quantity: 2, unitPrice: 250 },
        ],
      });

      // Subtotal: 3000 + (2 * 250) = 3500
      // Net: 3500 - 500 = 3000
      expect(result.subTotal).toBe(3500);
      expect(result.discountAmount).toBe(500);
      expect(result.totalAmount).toBe(3000);
      expect(result.dueAmount).toBe(3000);
      expect(result.status).toBe(InvoiceStatus.PENDING);
    });
  });

  describe('PaymentsService & Partial Payments', () => {
    it('should update invoice status to PARTIALLY_PAID then PAID as payments accumulate', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceCode: 'INV-5001',
        status: InvoiceStatus.PENDING,
        totalAmount: 3000,
        paidAmount: 0,
        dueAmount: 3000,
      });

      mockPrismaService.payment.create.mockResolvedValue({
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: 1000,
        paymentMethod: PaymentMethod.UPI,
      });

      mockPrismaService.payment.findMany.mockResolvedValue([
        { id: 'pay-1', amount: 1000 },
      ]);

      mockPrismaService.invoice.update.mockImplementation((args) => Promise.resolve(args.data));

      const pay1 = await paymentsService.create({
        invoiceId: 'inv-1',
        amount: 1000,
        paymentMethod: PaymentMethod.UPI,
      });

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            paidAmount: 1000,
            dueAmount: 2000,
            status: InvoiceStatus.PARTIALLY_PAID,
          }),
        }),
      );

      // Now 2nd payment of 2000
      mockPrismaService.payment.findMany.mockResolvedValue([
        { id: 'pay-1', amount: 1000 },
        { id: 'pay-2', amount: 2000 },
      ]);

      await paymentsService.create({
        invoiceId: 'inv-1',
        amount: 2000,
        paymentMethod: PaymentMethod.CASH,
      });

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            paidAmount: 3000,
            dueAmount: 0,
            status: InvoiceStatus.PAID,
          }),
        }),
      );
    });
  });

  describe('RefundsService', () => {
    it('should record a refund as a separate record and update invoice to REFUNDED', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: 3000,
        refunds: [],
        invoice: {
          id: 'inv-1',
          invoiceCode: 'INV-5001',
          status: InvoiceStatus.PAID,
          totalAmount: 3000,
        },
      });

      mockPrismaService.refund.create.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-1',
        amount: 3000,
        reason: 'Patient requested refund',
      });

      mockPrismaService.payment.findMany.mockResolvedValue([
        { id: 'pay-1', amount: 3000, refunds: [{ amount: 3000 }] },
      ]);

      mockPrismaService.invoice.update.mockResolvedValue(true);

      const refund = await refundsService.create(
        { paymentId: 'pay-1', amount: 3000, reason: 'Patient requested refund' },
        'admin-user-id',
      );

      expect(mockPrismaService.refund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentId: 'pay-1',
          amount: 3000,
          reason: 'Patient requested refund',
        }),
      });

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            status: InvoiceStatus.REFUNDED,
          }),
        }),
      );
    });
  });
});
