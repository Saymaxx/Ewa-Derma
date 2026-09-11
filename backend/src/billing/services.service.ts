import { Injectable, NotFoundException, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const PLACEHOLDER_SERVICES = [
  { name: 'Consultation', category: 'Consultation', basePrice: 500, description: 'General dermatology consultation' },
  { name: 'Chemical Peel', category: 'Procedure', basePrice: 2500, description: 'Exfoliating skin rejuvenation treatment' },
  { name: 'Laser Hair Reduction (per session)', category: 'Laser', basePrice: 3000, description: 'Laser hair removal treatment per session' },
  { name: 'PRP Therapy (per session)', category: 'Procedure', basePrice: 5000, description: 'Platelet-Rich Plasma skin & hair therapy' },
  { name: 'Facial', category: 'Medi-Facial', basePrice: 1500, description: 'Clinical facial treatment' },
  { name: 'Hair Treatment', category: 'Hair Care', basePrice: 2000, description: 'Specialized hair & scalp revitalization treatment' },
];

@Injectable()
export class ServicesService implements OnModuleInit {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async onModuleInit() {
    await this.seedPlaceholderServices();
  }

  async seedPlaceholderServices() {
    const count = await this.prisma.service.count();
    if (count === 0) {
      this.logger.log('Seeding Phase 4 placeholder service catalog...');
      for (const svc of PLACEHOLDER_SERVICES) {
        await this.prisma.service.create({
          data: {
            name: svc.name,
            category: svc.category,
            basePrice: svc.basePrice,
            description: svc.description,
            taxRate: 0.0,
            prices: {
              create: {
                price: svc.basePrice,
                isCurrent: true,
              },
            },
          },
        });
      }
      this.logger.log('Placeholder service catalog seeded successfully.');
    }
  }

  async create(dto: CreateServiceDto, userId?: string) {
    const existing = await this.prisma.service.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Service with name '${dto.name}' already exists.`);
    }

    const service = await this.prisma.service.create({
      data: {
        name: dto.name,
        category: dto.category,
        description: dto.description,
        basePrice: dto.basePrice,
        taxRate: dto.taxRate ?? 0,
        isActive: dto.isActive ?? true,
        prices: {
          create: {
            price: dto.basePrice,
            isCurrent: true,
          },
        },
      },
    });

    if (userId) {
      await this.auditLogService.log({
        userId,
        action: 'SERVICE_CREATED',
        entityName: 'Service',
        entityId: service.id,
        details: { name: service.name, basePrice: dto.basePrice },
      });
    }

    return service;
  }

  async findAll(includeInactive = false) {
    return this.prisma.service.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        prices: {
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });
    if (!service) {
      throw new NotFoundException(`Service not found with ID: ${id}`);
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto, userId?: string) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.service.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Service name '${dto.name}' is already taken.`);
      }
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.taxRate !== undefined && { taxRate: dto.taxRate }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    if (dto.basePrice !== undefined) {
      // Update price history
      await this.prisma.servicePrice.updateMany({
        where: { serviceId: id, isCurrent: true },
        data: { isCurrent: false },
      });
      await this.prisma.servicePrice.create({
        data: {
          serviceId: id,
          price: dto.basePrice,
          isCurrent: true,
        },
      });
    }

    if (userId) {
      await this.auditLogService.log({
        userId,
        action: 'SERVICE_UPDATED',
        entityName: 'Service',
        entityId: id,
        details: dto,
      });
    }

    return updated;
  }

  async remove(id: string, userId?: string, permanent = false) {
    const service = await this.findOne(id);

    if (permanent) {
      await this.prisma.$transaction(async (tx) => {
        // Unlink from procedure appointments
        await tx.appointment.updateMany({
          where: { procedureServiceId: id },
          data: { procedureServiceId: null },
        });

        // Unlink from invoice items (invoice retains description, unitPrice, taxRate, totalPrice)
        await tx.invoiceItem.updateMany({
          where: { serviceId: id },
          data: { serviceId: null },
        });

        // Delete service price histories
        await tx.servicePrice.deleteMany({
          where: { serviceId: id },
        });

        // Delete service permanently
        await tx.service.delete({
          where: { id },
        });
      });

      if (userId) {
        await this.auditLogService.log({
          userId,
          action: 'SERVICE_DELETED',
          entityName: 'Service',
          entityId: id,
          details: { name: service.name, permanent: true },
        });
      }

      return { message: `Service '${service.name}' has been permanently deleted.` };
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: { isActive: !service.isActive ? true : false },
    });

    if (userId) {
      await this.auditLogService.log({
        userId,
        action: updated.isActive ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED',
        entityName: 'Service',
        entityId: id,
        details: { name: updated.name, isActive: updated.isActive },
      });
    }

    return updated;
  }
}

