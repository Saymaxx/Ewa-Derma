import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';

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

    return this.prisma.medicine.findMany({
      where,
      take: safeLimit,
      orderBy: { name: 'asc' },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine not found with ID: ${id}`);
    }

    return medicine;
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
        isActive: true,
      },
      include: {
        category: true,
      },
    });
  }
}
