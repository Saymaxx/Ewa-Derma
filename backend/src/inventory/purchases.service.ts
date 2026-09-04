import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { InventoryTransactionType } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page?: number, limit: number = 50) {
    const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 100);
    const safeSkip = page ? (Math.max(1, Number(page)) - 1) * safeLimit : undefined;

    return this.prisma.inventoryTransaction.findMany({
      where: { transactionType: InventoryTransactionType.PURCHASE_IN },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      skip: safeSkip,
      include: {
        medicine: { select: { id: true, name: true, brand: true, unit: true } },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            purchasePrice: true,
            supplier: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async recordPurchase(dto: CreatePurchaseDto, userId?: string) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine not found with ID: ${dto.medicineId}`);
    }

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new NotFoundException(`Supplier not found with ID: ${dto.supplierId}`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Find or create MedicineBatch
      let batch = await tx.medicineBatch.findUnique({
        where: {
          medicineId_batchNumber: {
            medicineId: dto.medicineId,
            batchNumber: dto.batchNumber.trim(),
          },
        },
      });

      if (!batch) {
        batch = await tx.medicineBatch.create({
          data: {
            medicineId: dto.medicineId,
            supplierId: dto.supplierId || null,
            batchNumber: dto.batchNumber.trim(),
            expiryDate: new Date(dto.expiryDate),
            purchasePrice: dto.purchasePrice,
            initialQuantity: dto.quantity,
          },
        });
      } else {
        // Update batch initialQuantity accumulation
        batch = await tx.medicineBatch.update({
          where: { id: batch.id },
          data: {
            initialQuantity: batch.initialQuantity + dto.quantity,
            purchasePrice: dto.purchasePrice,
            expiryDate: new Date(dto.expiryDate),
          },
        });
      }

      // Update medicine purchasePrice snapshot
      await tx.medicine.update({
        where: { id: dto.medicineId },
        data: { purchasePrice: dto.purchasePrice },
      });

      // 2. Create PURCHASE_IN transaction row
      const transaction = await tx.inventoryTransaction.create({
        data: {
          medicineId: dto.medicineId,
          batchId: batch.id,
          transactionType: InventoryTransactionType.PURCHASE_IN,
          quantity: dto.quantity, // Positive for IN
          referenceNumber: dto.referenceNumber?.trim() || null,
          notes: dto.notes?.trim() || 'Stock purchase received',
          dispensedById: userId || null,
        },
        include: {
          medicine: { select: { id: true, name: true } },
          batch: true,
        },
      });

      return transaction;
    });
  }
}
