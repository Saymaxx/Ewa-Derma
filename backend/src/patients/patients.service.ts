import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationTemplates } from '../notifications/templates/notification.templates';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityIdService: EntityIdService,
    private readonly notificationsService: NotificationsService,
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

    // Part C: Fire-and-forget WhatsApp registration confirmation
    if (patient.phone && patient.phone.trim()) {
      const template = NotificationTemplates.patientRegistration({
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        patientId: patient.patientCode,
      });

      this.notificationsService
        .dispatch({
          channel: NotificationChannel.WHATSAPP,
          type: NotificationType.PATIENT_REGISTRATION,
          recipient: patient.phone,
          templateName: template.templateName,
          templateLanguage: template.templateLanguage,
          templateParameters: template.templateParameters,
          subject: template.subject,
          content: template.content,
          relatedEntity: 'PATIENT',
          relatedEntityId: patient.id,
        })
        .catch((err) => {
          this.logger.error(
            `Async WhatsApp registration notification failed for patient ${patient.patientCode}: ${err.message}`,
          );
        });
    }

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

  async remove(id: string, permanent = false) {
    const existing = await this.prisma.patient.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Patient not found with ID: ${id}`);
    }

    if (permanent) {
      await this.prisma.$transaction(async (tx) => {
        // 1. Invoices & Payments & Refunds
        const invoices = await tx.invoice.findMany({ where: { patientId: id }, select: { id: true } });
        const invoiceIds = invoices.map((i) => i.id);
        if (invoiceIds.length > 0) {
          const payments = await tx.payment.findMany({ where: { invoiceId: { in: invoiceIds } }, select: { id: true } });
          const paymentIds = payments.map((p) => p.id);
          if (paymentIds.length > 0) {
            await tx.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
            await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
          }
          await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
          await tx.invoice.deleteMany({ where: { patientId: id } });
        }

        // 2. Prescriptions
        await tx.prescriptionItem.deleteMany({ where: { prescription: { patientId: id } } });
        await tx.prescription.deleteMany({ where: { patientId: id } });

        // 3. Consultations
        await tx.consultationNote.deleteMany({ where: { consultation: { patientId: id } } });
        await tx.diagnosis.deleteMany({ where: { consultation: { patientId: id } } });
        await tx.consultation.deleteMany({ where: { patientId: id } });

        // 4. Appointments & Follow-ups
        await tx.appointmentStatusHistory.deleteMany({ where: { appointment: { patientId: id } } });
        await tx.appointment.deleteMany({ where: { patientId: id } });
        await tx.followUp.deleteMany({ where: { patientId: id } });
        await tx.patientNote.deleteMany({ where: { patientId: id } });
        await tx.patientDocument.deleteMany({ where: { patientId: id } });

        // 5. Delete patient
        await tx.patient.delete({ where: { id } });
      });

      return {
        message: `Patient ${existing.firstName} ${existing.lastName} (${existing.patientCode}) permanently deleted.`,
      };
    }

    // Deactivate patient (preserving clinical history records)
    return this.prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
