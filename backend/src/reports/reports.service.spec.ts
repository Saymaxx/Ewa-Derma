import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsReportService } from './appointments-report.service';
import { PatientsReportService } from './patients-report.service';
import { RevenueReportService } from './revenue-report.service';
import { InventoryReportService } from './inventory-report.service';
import { ReportExporterService } from './report-exporter.service';
import { ForbiddenException } from '@nestjs/common';

describe('ReportsModule Services', () => {
  let appointmentsReportService: AppointmentsReportService;
  let patientsReportService: PatientsReportService;
  let revenueReportService: RevenueReportService;
  let inventoryReportService: InventoryReportService;
  let reportExporterService: ReportExporterService;

  const mockPrismaService = {
    appointment: {
      findMany: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
    },
    doctor: {
      findMany: jest.fn(),
    },
    consultation: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    refund: {
      findMany: jest.fn(),
    },
    medicine: {
      findMany: jest.fn(),
    },
    medicineBatch: {
      findMany: jest.fn(),
    },
    inventoryTransaction: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsReportService,
        PatientsReportService,
        RevenueReportService,
        InventoryReportService,
        ReportExporterService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appointmentsReportService = module.get<AppointmentsReportService>(AppointmentsReportService);
    patientsReportService = module.get<PatientsReportService>(PatientsReportService);
    revenueReportService = module.get<RevenueReportService>(RevenueReportService);
    inventoryReportService = module.get<InventoryReportService>(InventoryReportService);
    reportExporterService = module.get<ReportExporterService>(ReportExporterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RevenueReportService (Phase 7b)', () => {
    it('should calculate collected vs billed revenue and account for refunds', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceCode: 'INV-5001',
          totalAmount: '5000.00',
          paidAmount: '5000.00',
          dueAmount: '0.00',
          status: 'PAID',
          createdAt: new Date('2026-09-01'),
          patient: { patientCode: 'P-1001', firstName: 'Aarav', lastName: 'Gupta', phone: '9876543210' },
          items: [{ itemType: 'SERVICE', description: 'Laser Hair Removal', quantity: 1, totalPrice: '5000.00' }],
          payments: [{ amount: '5000.00' }],
          appointment: { doctor: { id: 'doc-1', user: { firstName: 'A', lastName: 'Sharma' } } },
        },
      ]);

      mockPrismaService.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: '5000.00',
          paymentMethod: 'UPI',
          createdAt: new Date('2026-09-01'),
        },
      ]);

      mockPrismaService.refund.findMany.mockResolvedValue([
        {
          id: 'ref-1',
          amount: '500.00',
          createdAt: new Date('2026-09-02'),
        },
      ]);

      const result = await revenueReportService.generateRevenueReport(
        { startDate: '2026-09-01', endDate: '2026-09-30' },
        { userId: 'admin-1', roles: ['ADMIN'] },
      );

      expect(result.summary.billedRevenue).toBe(5000);
      expect(result.summary.totalRefundsIssued).toBe(500);
      expect(result.summary.collectedRevenue).toBe(4500); // Gross 5000 - Refund 500
      expect(result.paymentMethodBreakdown).toContainEqual(
        expect.objectContaining({ method: 'UPI / QR', amount: 5000 }),
      );
    });

    it('should throw ForbiddenException if RECEPTIONIST tries to access revenue report', async () => {
      await expect(
        revenueReportService.generateRevenueReport(
          { startDate: '2026-09-01', endDate: '2026-09-30' },
          { userId: 'rec-1', roles: ['RECEPTIONIST'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('InventoryReportService (Phase 7b)', () => {
    it('should compute stock valuation, low stock, expiring batches, and ledger history', async () => {
      mockPrismaService.medicine.findMany.mockResolvedValue([
        {
          id: 'med-1',
          name: 'Retinol Cream 0.05%',
          brandName: 'DermaCare',
          category: 'Topical',
          sku: 'RET-005',
          minimumStock: 10,
          purchasePrice: '350.00',
          unitPrice: '500.00',
          batches: [{ id: 'b-1', batchNumber: 'BATCH-101', quantity: 8, expiryDate: new Date('2026-09-20') }],
          transactions: [
            { type: 'PURCHASE_IN', quantity: 20 },
            { type: 'DISPENSED_OUT', quantity: -12 },
          ],
        },
      ]);

      mockPrismaService.medicineBatch.findMany.mockResolvedValue([
        {
          id: 'b-1',
          batchNumber: 'BATCH-101',
          quantity: 8,
          expiryDate: new Date('2026-09-20'),
          medicine: { name: 'Retinol Cream 0.05%', sku: 'RET-005', category: 'Topical' },
        },
      ]);

      mockPrismaService.inventoryTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          type: 'DISPENSED_OUT',
          quantity: 12,
          createdAt: new Date('2026-09-01'),
          medicineId: 'med-1',
          medicine: { name: 'Retinol Cream 0.05%', sku: 'RET-005', unitPrice: '500.00' },
          batch: { batchNumber: 'BATCH-101' },
          performedBy: { firstName: 'R', lastName: 'Manager' },
          reason: 'Prescription RX-3001',
        },
      ]);

      const result = await inventoryReportService.generateInventoryReport(
        { startDate: '2026-09-01', endDate: '2026-09-30' },
        { userId: 'inv-1', roles: ['INVENTORY_MANAGER'] },
      );

      expect(result.summary.totalMedicinesCount).toBe(1);
      expect(result.currentStockItems[0].computedStock).toBe(8); // 20 in - 12 out
      expect(result.currentStockItems[0].isLowStock).toBe(true); // 8 <= min 10
      expect(result.summary.totalInventoryValue).toBe(2800); // 8 * 350
      expect(result.expiringBatches).toHaveLength(1);
      expect(result.movements).toHaveLength(1);
    });

    it('should throw ForbiddenException if RECEPTIONIST tries to access inventory report', async () => {
      await expect(
        inventoryReportService.generateInventoryReport(
          { startDate: '2026-09-01', endDate: '2026-09-30' },
          { userId: 'rec-1', roles: ['RECEPTIONIST'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ReportExporterService Export Handlers (Phase 7b)', () => {
    const revenueSample = {
      dateRange: { startDate: '2026-09-01', endDate: '2026-09-30' },
      summary: { collectedRevenue: 4500, billedRevenue: 5000, totalOutstandingDue: 0, totalRefundsIssued: 500, invoiceCount: 1, paymentCount: 1 },
      paymentMethodBreakdown: [{ method: 'UPI / QR', count: 1, amount: 5000, percentage: 100 }],
      doctorBreakdown: [{ doctorName: 'Dr. A Sharma', billed: 5000, collected: 5000, invoiceCount: 1 }],
      items: [{ invoiceCode: 'INV-5001', createdAt: '2026-09-01', patientCode: 'P-1001', patientName: 'Aarav Gupta', patientPhone: '9876543210', doctorName: 'Dr. A Sharma', status: 'PAID', totalAmount: 5000, paidAmount: 5000, dueAmount: 0 }],
    };

    it('should export Revenue PDF report buffer', async () => {
      const res = await reportExporterService.exportRevenueReport(revenueSample, 'pdf');
      expect(res.mimeType).toBe('application/pdf');
      expect(res.buffer).toBeInstanceOf(Buffer);
    });

    it('should export Revenue CSV report buffer', async () => {
      const res = await reportExporterService.exportRevenueReport(revenueSample, 'csv');
      expect(res.mimeType).toBe('text/csv');
      expect(res.buffer.toString('utf-8')).toContain('Collected Revenue (Actual Net Received)');
    });

    it('should export Inventory PDF report buffer', async () => {
      const inventorySample = {
        dateRange: { startDate: '2026-09-01', endDate: '2026-09-30' },
        summary: { totalInventoryValue: 2800, totalMedicinesCount: 1, lowStockCount: 1, expiringBatchesCount: 1, totalItemsDispensed: 12 },
        currentStockItems: [{ name: 'Retinol Cream', sku: 'RET-005', category: 'Topical', computedStock: 8, minimumStock: 10, purchasePrice: 350, stockValuation: 2800, isLowStock: true }],
        expiringBatches: [],
        movements: [],
      };

      const res = await reportExporterService.exportInventoryReport(inventorySample, 'pdf');
      expect(res.mimeType).toBe('application/pdf');
      expect(res.buffer).toBeInstanceOf(Buffer);
    });
  });
});
