import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityIdService: EntityIdService,
  ) {}

  async create(dto: CreatePatientDto) {
    const cleanPhone = dto.phone.trim();
    const cleanEmail = dto.email ? dto.email.toLowerCase().trim() : null;

    // 1. Check for Duplicate Patient Record by Phone
    const existingByPhone = await this.prisma.patient.findFirst({
      where: { phone: cleanPhone, isActive: true },
    });

    if (existingByPhone) {
      throw new ConflictException(
        `A patient with phone number "${cleanPhone}" is already registered (${existingByPhone.patientCode} - ${existingByPhone.firstName} ${existingByPhone.lastName}). Duplicate patient records are not allowed.`,
      );
    }

    // 2. Check for Duplicate Patient Record by Email (if provided)
    if (cleanEmail) {
      const existingByEmail = await this.prisma.patient.findFirst({
        where: { email: cleanEmail, isActive: true },
      });

      if (existingByEmail) {
        throw new ConflictException(
          `A patient with email "${cleanEmail}" is already registered (${existingByEmail.patientCode} - ${existingByEmail.firstName} ${existingByEmail.lastName}). Duplicate patient records are not allowed.`,
        );
      }
    }

    const patientCode = await this.entityIdService.generateNextId('P');

    const patient = await this.prisma.patient.create({
      data: {
        patientCode,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender || 'NOT_SPECIFIED',
        bloodGroup: dto.bloodGroup || 'UNKNOWN',
        address: dto.address?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        emergencyContact: dto.emergencyContact?.trim() || null,
        medicalHistory: dto.medicalHistory?.trim() || null,
        allergies: dto.allergies?.trim() || null,
        isActive: true,
      },
    });

    this.logger.log(`Created new patient: ${patient.patientCode} (${patient.firstName} ${patient.lastName})`);
    return patient;
  }

  async search(search?: string, page: number = 1, limit: number = 20) {
    const safePage = Math.max(1, isNaN(page) ? 1 : page);
    const safeLimit = Math.max(1, isNaN(limit) ? 20 : limit);
    const skip = (safePage - 1) * safeLimit;

    const whereClause: any = {
      isActive: true,
    };

    if (search && search.trim().length > 0) {
      const q = search.trim();
      whereClause.OR = [
        { patientCode: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: safeLimit,
        include: {
          appointments: {
            take: 1,
            orderBy: { appointmentDate: 'desc' },
            select: {
              appointmentDate: true,
              startTime: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.patient.count({ where: whereClause }),
    ]);

    return {
      items: patients,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [{ id }, { patientCode: id }],
      },
      include: {
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          include: {
            doctor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        documents: {
          where: { isVoid: false },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found with identifier: ${id}`);
    }

    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    const existing = await this.prisma.patient.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Patient not found with ID: ${id}`);
    }

    return this.prisma.patient.update({
      where: { id },
      data: {
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email ? dto.email.toLowerCase().trim() : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        emergencyContact: dto.emergencyContact?.trim(),
        medicalHistory: dto.medicalHistory?.trim(),
        allergies: dto.allergies?.trim(),
        isActive: dto.isActive,
      },
    });
  }
}
