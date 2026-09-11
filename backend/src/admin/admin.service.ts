import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto';
import { RoleName } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async getClinicSettings() {
    let settings = await this.prisma.clinicSetting.findFirst();
    if (!settings) {
      settings = await this.prisma.clinicSetting.create({
        data: {
          clinicName: 'Ewa Derma Clinic',
          address: '4th Floor, Medical Arts Building, MG Road, Bangalore 560001',
          contactNumber: '+91 9120854977',
          email: 'contact@ewaderma.com',
          gstNumber: '29ABCDE1234F1Z5',
          taxRate: 18.0,
          openingTime: '10:00',
          closingTime: '19:00',
          operatingDays: 'Mon,Tue,Wed,Thu,Fri,Sat',
          slotDuration: 30,
          logoUrl: '/ewa-derma-logo.jpg',
        },
      });
    }
    return settings;
  }

  async updateClinicSettings(dto: UpdateClinicSettingsDto) {
    let settings = await this.prisma.clinicSetting.findFirst();

    if (!settings) {
      settings = await this.prisma.clinicSetting.create({
        data: {
          clinicName: dto.clinicName?.trim() || 'Ewa Derma Clinic',
          address: dto.address?.trim() || '4th Floor, Medical Arts Building, MG Road, Bangalore 560001',
          contactNumber: dto.contactNumber?.trim() || '+91 9120854977',
          email: dto.email?.trim() || 'contact@ewaderma.com',
          gstNumber: dto.gstNumber?.trim() || null,
          taxRate: dto.taxRate !== undefined ? dto.taxRate : 18.0,
          openingTime: dto.openingTime || '10:00',
          closingTime: dto.closingTime || '19:00',
          operatingDays: dto.operatingDays || 'Mon,Tue,Wed,Thu,Fri,Sat',
          slotDuration: dto.slotDuration !== undefined ? dto.slotDuration : 30,
          logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : '/ewa-derma-logo.jpg',
        },
      });
    } else {
      settings = await this.prisma.clinicSetting.update({
        where: { id: settings.id },
        data: {
          ...(dto.clinicName !== undefined && { clinicName: dto.clinicName.trim() }),
          ...(dto.address !== undefined && { address: dto.address.trim() }),
          ...(dto.contactNumber !== undefined && { contactNumber: dto.contactNumber.trim() }),
          ...(dto.email !== undefined && { email: dto.email ? dto.email.trim() : null }),
          ...(dto.gstNumber !== undefined && { gstNumber: dto.gstNumber ? dto.gstNumber.trim() : null }),
          ...(dto.taxRate !== undefined && { taxRate: dto.taxRate }),
          ...(dto.openingTime !== undefined && { openingTime: dto.openingTime }),
          ...(dto.closingTime !== undefined && { closingTime: dto.closingTime }),
          ...(dto.operatingDays !== undefined && { operatingDays: dto.operatingDays }),
          ...(dto.slotDuration !== undefined && { slotDuration: dto.slotDuration }),
          ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        },
      });
    }

    // Invalidate cached clinic settings in AuthService so all users receive the update immediately
    this.authService.invalidateClinicCache();

    return settings;
  }

  // ==========================================
  // STAFF & USER MANAGEMENT
  // ==========================================

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
        doctor: {
          select: {
            id: true,
            specialization: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(dto: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: RoleName;
    password?: string;
  }) {
    const emailNormalized = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existing) {
      throw new ConflictException(`User with email '${emailNormalized}' already exists.`);
    }

    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });

    if (!role) {
      throw new BadRequestException(`Role '${dto.role}' is invalid.`);
    }

    const rawPassword = dto.password || 'Staff@123';
    const passwordHash = await argon2.hash(rawPassword);

    return this.prisma.user.create({
      data: {
        email: emailNormalized,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phoneNumber: dto.phone?.trim() || null,
        passwordHash,
        isActive: true,
        userRoles: {
          create: {
            roleId: role.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async updateUser(
    id: string,
    dto: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      role?: RoleName;
      isActive?: boolean;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (existing) {
        throw new ConflictException(`Email '${dto.email}' is already in use.`);
      }
    }

    // If role is being changed
    if (dto.role) {
      const newRole = await this.prisma.role.findUnique({
        where: { name: dto.role },
      });
      if (newRole) {
        await this.prisma.userRole.deleteMany({ where: { userId: id } });
        await this.prisma.userRole.create({
          data: {
            userId: id,
            roleId: newRole.id,
          },
        });
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName.trim() }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName.trim() }),
        ...(dto.email !== undefined && { email: dto.email.toLowerCase().trim() }),
        ...(dto.phone !== undefined && { phoneNumber: dto.phone.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async deleteUser(id: string, permanent: boolean = false, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    if (currentUserId && user.id === currentUserId) {
      throw new BadRequestException('You cannot delete your own logged-in administrator account.');
    }

    if (permanent) {
      await this.prisma.$transaction(async (tx) => {
        // If user has doctor profile
        if (user.doctor) {
          const docId = user.doctor.id;

          // Unlink invoices linked to this doctor's appointments or consultations
          await tx.invoice.updateMany({
            where: {
              OR: [
                { appointment: { doctorId: docId } },
                { consultation: { doctorId: docId } },
              ],
            },
            data: {
              appointmentId: null,
              consultationId: null,
            },
          });

          // Unlink follow-ups assigned to this doctor
          await tx.followUp.updateMany({
            where: { doctorId: docId },
            data: { doctorId: null },
          });

          await tx.appointmentStatusHistory.deleteMany({
            where: { appointment: { doctorId: docId } },
          });
          await tx.prescriptionItem.deleteMany({
            where: { prescription: { doctorId: docId } },
          });
          await tx.prescription.deleteMany({ where: { doctorId: docId } });
          await tx.consultationNote.deleteMany({
            where: { consultation: { doctorId: docId } },
          });
          await tx.diagnosis.deleteMany({
            where: { consultation: { doctorId: docId } },
          });
          await tx.consultation.deleteMany({ where: { doctorId: docId } });
          await tx.appointment.deleteMany({ where: { doctorId: docId } });
          await tx.doctor.delete({ where: { id: docId } });
        }

        // Clean up direct user relations
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.refreshToken.deleteMany({ where: { userId: id } });
        await tx.consultationNote.deleteMany({ where: { authorId: id } });
        await tx.patientNote.deleteMany({ where: { authorId: id } });
        await tx.auditLog.deleteMany({ where: { userId: id } });

        // Unlink or reassign invoices and payments
        await tx.invoice.updateMany({
          where: { createdById: id },
          data: { createdById: currentUserId || null },
        });

        await tx.payment.updateMany({
          where: { recordedById: id },
          data: { recordedById: currentUserId || null },
        });

        await tx.inventoryTransaction.updateMany({
          where: { dispensedById: id },
          data: { dispensedById: null },
        });

        await tx.prescriptionItem.updateMany({
          where: { dispensedById: id },
          data: { dispensedById: null },
        });

        // Delete user row permanently
        await tx.user.delete({ where: { id } });
      });

      return { message: `Staff account for ${user.firstName} ${user.lastName} has been permanently deleted.` };
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive ? true : false },
    });
  }

  async resetUserPassword(id: string, newPassword?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    const rawPassword = newPassword || 'Staff@123';
    const passwordHash = await argon2.hash(rawPassword);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { message: 'Password reset successfully' };
  }

  // ==========================================
  // MEDIA STORAGE & RETENTION CLEANUP
  // ==========================================

  async getStorageStats() {
    // 1. Consultations photos
    const consultationsWithPhotos = await this.prisma.consultation.findMany({
      where: {
        OR: [
          { beforeImageUrl: { not: null } },
          { afterImageUrl: { not: null } },
        ],
      },
      select: {
        id: true,
        beforeImageUrl: true,
        afterImageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let beforeCount = 0;
    let afterCount = 0;
    let totalConsultationBytes = 0;
    let oldestDate: Date | null = null;

    for (const c of consultationsWithPhotos) {
      if (c.beforeImageUrl) {
        beforeCount++;
        totalConsultationBytes += Buffer.byteLength(c.beforeImageUrl, 'utf8');
        if (!oldestDate || c.createdAt < oldestDate) oldestDate = c.createdAt;
      }
      if (c.afterImageUrl) {
        afterCount++;
        totalConsultationBytes += Buffer.byteLength(c.afterImageUrl, 'utf8');
        if (!oldestDate || c.createdAt < oldestDate) oldestDate = c.createdAt;
      }
    }

    // 2. Prescriptions scans
    const prescriptionsWithScans = await this.prisma.prescription.findMany({
      where: {
        scanImageUrl: { not: null },
      },
      select: {
        id: true,
        scanImageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let prescriptionScansCount = 0;
    let totalPrescriptionBytes = 0;

    for (const p of prescriptionsWithScans) {
      if (p.scanImageUrl) {
        prescriptionScansCount++;
        totalPrescriptionBytes += Buffer.byteLength(p.scanImageUrl, 'utf8');
        if (!oldestDate || p.createdAt < oldestDate) oldestDate = p.createdAt;
      }
    }

    const totalPhotos = beforeCount + afterCount + prescriptionScansCount;
    const totalBytes = totalConsultationBytes + totalPrescriptionBytes;
    // Estimated MB
    const estimatedSizeMB = Number((Math.max(totalBytes, totalPhotos * 150 * 1024) / (1024 * 1024)).toFixed(2));

    return {
      totalPhotos,
      estimatedSizeMB,
      beforePhotosCount: beforeCount,
      afterPhotosCount: afterCount,
      prescriptionScansCount,
      oldestPhotoDate: oldestDate ? oldestDate.toISOString() : null,
      storageTier: 'Railway PostgreSQL',
      maxSafeStorageMB: 5000, // 5GB baseline
      usedPercentage: Number(((estimatedSizeMB / 5000) * 100).toFixed(2)),
    };
  }

  async cleanupOldPhotos(dto: { olderThanMonths: number }, user: { id: string; email: string }) {
    const months = Math.max(1, dto.olderThanMonths || 12);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    // Find and clear old consultation photos
    const consultationUpdate = await this.prisma.consultation.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        OR: [
          { beforeImageUrl: { not: null } },
          { afterImageUrl: { not: null } },
        ],
      },
      data: {
        beforeImageUrl: null,
        afterImageUrl: null,
      },
    });

    // Find and clear old prescription scans
    const prescriptionUpdate = await this.prisma.prescription.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        scanImageUrl: { not: null },
      },
      data: {
        scanImageUrl: null,
      },
    });

    const totalCleared = consultationUpdate.count + prescriptionUpdate.count;

    return {
      message: `Successfully cleaned up ${totalCleared} photo attachments older than ${months} months.`,
      clearedConsultations: consultationUpdate.count,
      clearedPrescriptions: prescriptionUpdate.count,
      totalCleared,
      cutoffDate: cutoffDate.toISOString(),
      olderThanMonths: months,
    };
  }

  async resetClinicTestData() {
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete all payments & refunds
      await tx.refund.deleteMany({});
      await tx.payment.deleteMany({});

      // 2. Delete invoice items and invoices
      await tx.invoiceItem.deleteMany({});
      await tx.invoice.deleteMany({});

      // 3. Delete prescriptions & items
      await tx.prescriptionItem.deleteMany({});
      await tx.prescription.deleteMany({});

      // 4. Delete consultations, diagnosis, notes
      await tx.consultationNote.deleteMany({});
      await tx.diagnosis.deleteMany({});
      await tx.consultation.deleteMany({});

      // 5. Delete appointments & status history & follow-ups
      await tx.appointmentStatusHistory.deleteMany({});
      await tx.appointment.deleteMany({});
      await tx.followUp.deleteMany({});

      // 6. Delete patient notes & documents & patients
      await tx.patientNote.deleteMany({});
      await tx.patientDocument.deleteMany({});
      await tx.patient.deleteMany({});

      // 7. Reset sequence counters to 1000
      const entities = ['P', 'A', 'INV', 'RX', 'C', 'FU'];
      for (const prefix of entities) {
        await tx.entitySequence.upsert({
          where: { prefix },
          update: { lastNumber: 1000 },
          create: { prefix, lastNumber: 1000 },
        });
      }

      return {
        success: true,
        message: 'All test data (patients, appointments, consultations, prescriptions, invoices) has been permanently wiped and sequence counters reset.',
      };
    });
  }
}

