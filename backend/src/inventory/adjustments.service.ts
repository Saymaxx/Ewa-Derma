import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { InventoryTransactionType } from '@prisma/client';

@Injectable()
export class AdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.inventoryTransaction.findMany({
      where: {
        transactionType: {
          in: [
            InventoryTransactionType.ADJUSTMENT_IN,
            InventoryTransactionType.ADJUSTMENT_OUT,
            InventoryTransactionType.DAMAGED_OUT,
            InventoryTransactionType.EXPIRED_OUT,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        medicine: { select: { id: true, name: true, brand: true } },
        batch: { select: { id: true, batchNumber: true } },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async recordAdjustment(dto: CreateAdjustmentDto, userId?: string) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Reason is mandatory for stock adjustments');
    }

    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine not found with ID: ${dto.medicineId}`);
    }

    if (dto.batchId) {
      const batch = await this.prisma.medicineBatch.findUnique({
        where: { id: dto.batchId },
      });
      if (!batch) {
        throw new NotFoundException(`Batch not found with ID: ${dto.batchId}`);
      }
    }

    // Determine signed quantity (Positive for IN, Negative for OUT)
    let signedQuantity = Math.abs(dto.quantity);
    if (
      dto.transactionType === InventoryTransactionType.ADJUSTMENT_OUT ||
      dto.transactionType === InventoryTransactionType.DAMAGED_OUT ||
      dto.transactionType === InventoryTransactionType.EXPIRED_OUT
    ) {
      signedQuantity = -Math.abs(dto.quantity);
    }

    return this.prisma.inventoryTransaction.create({
      data: {
        medicineId: dto.medicineId,
        batchId: dto.batchId || null,
        transactionType: dto.transactionType,
        quantity: signedQuantity,
        notes: dto.reason.trim(),
        dispensedById: userId || null,
      },
      include: {
        medicine: { select: { id: true, name: true } },
        batch: { select: { id: true, batchNumber: true } },
      },
    });
  }
}
