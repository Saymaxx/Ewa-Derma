import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesService } from './purchases.service';
import { AdjustmentsService } from './adjustments.service';
import { DispensingService } from './dispensing.service';
import { AlertsService } from './alerts.service';
import { MedicinesService } from '../medicines/medicines.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { InventoryTransactionType } from '@prisma/client';

describe('Inventory Module Unit Tests', () => {
  let purchasesService: PurchasesService;
  let adjustmentsService: AdjustmentsService;
  let dispensingService: DispensingService;
  let alertsService: AlertsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    medicine: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    medicineBatch: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
    },
    inventoryTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    prescription: {
      findUnique: jest.fn(),
    },
    prescriptionItem: {
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        AdjustmentsService,
        DispensingService,
        AlertsService,
        MedicinesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    purchasesService = module.get<PurchasesService>(PurchasesService);
    adjustmentsService = module.get<AdjustmentsService>(AdjustmentsService);
    dispensingService = module.get<DispensingService>(DispensingService);
    alertsService = module.get<AlertsService>(AlertsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('PurchasesService & Stock LEDGER', () => {
    it('should record a purchase, create/update batch, and insert PURCHASE_IN transaction', async () => {
      mockPrismaService.medicine.findUnique.mockResolvedValue({ id: 'med-1', name: 'Tretinoin Gel' });
      mockPrismaService.medicineBatch.findUnique.mockResolvedValue(null);
      mockPrismaService.medicineBatch.create.mockResolvedValue({
        id: 'batch-1',
        batchNumber: 'B001',
        initialQuantity: 100,
      });
      mockPrismaService.medicine.update.mockResolvedValue({});
      mockPrismaService.inventoryTransaction.create.mockResolvedValue({
        id: 'tx-1',
        quantity: 100,
        transactionType: InventoryTransactionType.PURCHASE_IN,
      });

      const res = await purchasesService.recordPurchase({
        medicineId: 'med-1',
        batchNumber: 'B001',
        quantity: 100,
        purchasePrice: 120,
        expiryDate: '2027-12-31',
      });

      expect(mockPrismaService.medicineBatch.create).toHaveBeenCalled();
      expect(mockPrismaService.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          medicineId: 'med-1',
          batchId: 'batch-1',
          transactionType: InventoryTransactionType.PURCHASE_IN,
          quantity: 100,
        }),
        include: expect.any(Object),
      });
      expect(res.quantity).toBe(100);
    });
  });

  describe('FEFO Dispensing Engine', () => {
    it('should select batch with nearest expiry date first (FEFO)', async () => {
      const nearExpiryBatch = {
        id: 'batch-near',
        batchNumber: 'B-NEAR',
        expiryDate: new Date('2026-10-01'),
        transactions: [{ quantity: 10 }],
      };
      const farExpiryBatch = {
        id: 'batch-far',
        batchNumber: 'B-FAR',
        expiryDate: new Date('2027-05-01'),
        transactions: [{ quantity: 50 }],
      };

      mockPrismaService.prescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        prescriptionCode: 'RX-3001',
        patient: { firstName: 'Aarav', lastName: 'Sharma' },
        items: [
          {
            id: 'item-1',
            medicineId: 'med-1',
            medicineName: 'Tretinoin Gel',
            quantity: 5,
            isDispensed: false,
          },
        ],
      });

      // Returns batches sorted by expiryDate asc (near first)
      mockPrismaService.medicineBatch.findMany.mockResolvedValue([nearExpiryBatch, farExpiryBatch]);
      mockPrismaService.inventoryTransaction.create.mockResolvedValue({ id: 'tx-disp-1' });
      mockPrismaService.prescriptionItem.update.mockResolvedValue({ id: 'item-1', isDispensed: true });

      const res = await dispensingService.dispensePrescription('rx-1', {});

      // Verify transaction was created against nearExpiryBatch first
      expect(mockPrismaService.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          medicineId: 'med-1',
          batchId: 'batch-near',
          transactionType: InventoryTransactionType.DISPENSED_OUT,
          quantity: -5,
          referenceNumber: 'RX-3001',
        }),
      });

      expect(res.dispensedItems[0].batchesUsed[0].batchId).toBe('batch-near');
      expect(res.dispensedItems[0].batchesUsed[0].quantityDrawn).toBe(5);
    });

    it('should reject dispensing if requested quantity exceeds total unexpired computed stock', async () => {
      mockPrismaService.prescription.findUnique.mockResolvedValue({
        id: 'rx-2',
        prescriptionCode: 'RX-3002',
        patient: { firstName: 'Ishan', lastName: 'Mishra' },
        items: [
          {
            id: 'item-2',
            medicineId: 'med-1',
            medicineName: 'Tretinoin Gel',
            quantity: 100, // Wants 100
            isDispensed: false,
          },
        ],
      });

      // Only 10 available in stock
      mockPrismaService.medicineBatch.findMany.mockResolvedValue([
        {
          id: 'batch-1',
          batchNumber: 'B-01',
          expiryDate: new Date('2027-01-01'),
          transactions: [{ quantity: 10 }],
        },
      ]);

      await expect(dispensingService.dispensePrescription('rx-2', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('AdjustmentsService', () => {
    it('should reject stock adjustment if reason is empty', async () => {
      await expect(
        adjustmentsService.recordAdjustment({
          medicineId: 'med-1',
          transactionType: InventoryTransactionType.DAMAGED_OUT,
          quantity: 2,
          reason: '', // Empty reason
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('AlertsService', () => {
    it('should compute low-stock medicines and expiring batches correctly', async () => {
      mockPrismaService.medicine.findMany.mockResolvedValue([
        {
          id: 'm-low',
          name: 'Sunscreen Gel',
          brand: 'DermaShield',
          minimumStock: 20,
          category: { name: 'Sunscreen' },
          unit: 'Tube',
          transactions: [{ quantity: 5 }], // Stock is 5 <= minStock 20 -> Low stock
        },
      ]);

      mockPrismaService.medicineBatch.findMany.mockResolvedValue([
        {
          id: 'b-exp',
          batchNumber: 'B-EXP',
          medicineId: 'm-low',
          expiryDate: new Date('2026-08-01'), // Expired
          medicine: { name: 'Sunscreen Gel', brand: 'DermaShield', unit: 'Tube' },
          supplier: { name: 'Vendor A' },
          transactions: [{ quantity: 10 }],
        },
      ]);

      const res = await alertsService.getInventoryAlerts();

      expect(res.summary.lowStockCount).toBe(1);
      expect(res.summary.expiredCount).toBe(1);
      expect(res.lowStockMedicines[0].shortage).toBe(15);
    });
  });
});
