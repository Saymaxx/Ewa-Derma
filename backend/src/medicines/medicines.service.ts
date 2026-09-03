import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';

@Injectable()
export class MedicinesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(search?: string, limit: number = 20) {
    const safeLimit = Math.max(1, isNaN(limit) ? 20 : limit);
    const where: any = { isActive: true };

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { genericName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.medicine.findMany({
      where,
      take: safeLimit,
      orderBy: { name: 'asc' },
      include: {
        category: {
          select: { id: true, name: true },
        },
        transactions: {
          select: { quantity: true },
        },
      },
    });

    return items.map((med) => {
      const computedStock = med.transactions.reduce((acc, t) => acc + t.quantity, 0);
      const { transactions, ...rest } = med;
      return {
        ...rest,
        computedStock,
        isLowStock: computedStock <= med.minimumStock,
      };
    });
  }

  async findOne(id: string) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        batches: {
          where: { isVoid: false },
          orderBy: { expiryDate: 'asc' },
          include: {
            supplier: { select: { id: true, name: true } },
            transactions: { select: { quantity: true } },
          },
        },
        transactions: {
          select: { quantity: true },
        },
      },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine not found with ID: ${id}`);
    }

    const computedStock = medicine.transactions.reduce((acc, t) => acc + t.quantity, 0);
    const batchesWithStock = medicine.batches.map((b) => {
      const batchStock = b.transactions.reduce((acc, t) => acc + t.quantity, 0);
      const { transactions, ...bRest } = b;
      return {
        ...bRest,
        computedStock: batchStock,
      };
    });

    const { transactions, batches, ...rest } = medicine;
    return {
      ...rest,
      computedStock,
      isLowStock: computedStock <= medicine.minimumStock,
      batches: batchesWithStock,
    };
  }

  async getComputedStock(id: string) {
    await this.findOne(id);

    const agg = await this.prisma.inventoryTransaction.aggregate({
      where: { medicineId: id },
      _sum: { quantity: true },
    });

    const totalStock = agg._sum.quantity || 0;

    const batches = await this.prisma.medicineBatch.findMany({
      where: { medicineId: id, isVoid: false },
      orderBy: { expiryDate: 'asc' },
      include: {
        transactions: {
          select: { quantity: true },
        },
      },
    });

    const batchBreakdown = batches.map((b) => ({
      batchId: b.id,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      purchasePrice: Number(b.purchasePrice),
      computedStock: b.transactions.reduce((acc, t) => acc + t.quantity, 0),
    }));

    return {
      medicineId: id,
      computedStock: totalStock,
      batches: batchBreakdown,
    };
  }

  async getTransactions(id: string) {
    await this.findOne(id);

    return this.prisma.inventoryTransaction.findMany({
      where: { medicineId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async create(dto: CreateMedicineDto) {
    return this.prisma.medicine.create({
      data: {
        name: dto.name.trim(),
        brand: dto.brand?.trim() || null,
        genericName: dto.genericName?.trim() || null,
        categoryId: dto.categoryId || null,
        unit: dto.unit || 'Tablet',
        unitPrice: dto.unitPrice || 0,
        mrp: dto.mrp || dto.unitPrice || 0,
        purchasePrice: dto.purchasePrice || 0,
        minimumStock: dto.minimumStock || 10,
        gstRate: dto.gstRate || 0,
        isActive: true,
      },
      include: {
        category: true,
      },
    });
  }

  async update(id: string, dto: UpdateMedicineDto) {
    await this.findOne(id);

    return this.prisma.medicine.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand?.trim() || null } : {}),
        ...(dto.genericName !== undefined ? { genericName: dto.genericName?.trim() || null } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId || null } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
        ...(dto.mrp !== undefined ? { mrp: dto.mrp } : {}),
        ...(dto.purchasePrice !== undefined ? { purchasePrice: dto.purchasePrice } : {}),
        ...(dto.minimumStock !== undefined ? { minimumStock: dto.minimumStock } : {}),
        ...(dto.gstRate !== undefined ? { gstRate: dto.gstRate } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        category: true,
      },
    });
  }

  async getCategories() {
    return this.prisma.medicineCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
