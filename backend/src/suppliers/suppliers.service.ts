import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, activeOnly: boolean = false) {
    const where: any = {};
    if (activeOnly) where.isActive = true;
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { contactPerson: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        batches: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { medicine: { select: { id: true, name: true } } },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier not found with ID: ${id}`);
    }

    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        name: dto.name.trim(),
        contactPerson: dto.contactPerson?.trim() || null,
        phone: dto.phone.trim(),
        email: dto.email?.trim() || null,
        gstin: dto.gstin?.trim() || null,
        address: dto.address?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.contactPerson !== undefined ? { contactPerson: dto.contactPerson?.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
        ...(dto.gstin !== undefined ? { gstin: dto.gstin?.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
