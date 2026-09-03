import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto';
import { InventoryTransactionType } from '@prisma/client';

@Injectable()
export class DispensingService {
  constructor(private readonly prisma: PrismaService) {}

  async dispensePrescription(prescriptionId: string, dto: DispensePrescriptionDto, userId?: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription not found with ID: ${prescriptionId}`);
    }

    // Filter items to dispense
    let itemsToDispense = prescription.items;
    if (dto.itemIds && dto.itemIds.length > 0) {
      itemsToDispense = prescription.items.filter((i) => dto.itemIds.includes(i.id));
    }

    if (itemsToDispense.length === 0) {
      throw new BadRequestException('No valid prescription items specified for dispensing');
    }

    // Filter out already dispensed items
    const undispensedItems = itemsToDispense.filter((i) => !i.isDispensed);
    if (undispensedItems.length === 0) {
      throw new BadRequestException('All selected prescription items have already been dispensed');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.$transaction(async (tx) => {
      const dispensingLogs: any[] = [];

      for (const item of undispensedItems) {
        if (!item.medicineId) {
          // Non-catalog custom medicine description without stock tracking — just mark dispensed
          await tx.prescriptionItem.update({
            where: { id: item.id },
            data: {
              isDispensed: true,
              dispensedAt: new Date(),
              dispensedById: userId || null,
            },
          });
          dispensingLogs.push({
            itemId: item.id,
            medicineName: item.medicineName,
            quantity: item.quantity,
            batchesUsed: [],
          });
          continue;
        }

        // 1. Fetch unexpired batches for this medicine
        const batches = await tx.medicineBatch.findMany({
          where: {
            medicineId: item.medicineId,
            isVoid: false,
            expiryDate: { gte: today },
          },
          orderBy: { expiryDate: 'asc' }, // FEFO Order: Nearest expiry first
          include: {
            transactions: { select: { quantity: true } },
          },
        });

        // Calculate available stock per batch
        const batchStocks = batches
          .map((b) => ({
            batch: b,
            computedStock: b.transactions.reduce((acc, t) => acc + t.quantity, 0),
          }))
          .filter((b) => b.computedStock > 0);

        const totalAvailableStock = batchStocks.reduce((acc, b) => acc + b.computedStock, 0);

        if (totalAvailableStock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${item.medicineName}". Available unexpired stock: ${totalAvailableStock}, Requested: ${item.quantity}`,
          );
        }

        // 2. FEFO Batch Selection & Stock Deduction
        let remainingNeeded = item.quantity;
        const batchesDrawn: any[] = [];

        for (const bObj of batchStocks) {
          if (remainingNeeded <= 0) break;

          const drawQuantity = Math.min(remainingNeeded, bObj.computedStock);

          // Create DISPENSED_OUT negative transaction entry
          await tx.inventoryTransaction.create({
            data: {
              medicineId: item.medicineId,
              batchId: bObj.batch.id,
              transactionType: InventoryTransactionType.DISPENSED_OUT,
              quantity: -drawQuantity, // Negative for OUT
              referenceNumber: prescription.prescriptionCode,
              notes: `Dispensed ${drawQuantity} units for Prescription ${prescription.prescriptionCode} (${prescription.patient.firstName} ${prescription.patient.lastName})`,
              dispensedById: userId || null,
            },
          });

          batchesDrawn.push({
            batchId: bObj.batch.id,
            batchNumber: bObj.batch.batchNumber,
            quantityDrawn: drawQuantity,
            expiryDate: bObj.batch.expiryDate,
          });

          remainingNeeded -= drawQuantity;
        }

        // Mark item as dispensed
        await tx.prescriptionItem.update({
          where: { id: item.id },
          data: {
            isDispensed: true,
            dispensedAt: new Date(),
            dispensedById: userId || null,
          },
        });

        dispensingLogs.push({
          itemId: item.id,
          medicineName: item.medicineName,
          quantity: item.quantity,
          batchesUsed: batchesDrawn,
        });
      }

      return {
        prescriptionCode: prescription.prescriptionCode,
        patient: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
        dispensedItems: dispensingLogs,
      };
    });
  }
}
