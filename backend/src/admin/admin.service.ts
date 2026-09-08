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
          contactNumber: '+91 98765 43210',
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
          clinicName: dto.clinicName || 'Ewa Derma Clinic',
          address: dto.address || '4th Floor, Medical Arts Building, MG Road, Bangalore 560001',
          contactNumber: dto.contactNumber || '+91 98765 43210',
          email: dto.email || 'contact@ewaderma.com',
          gstNumber: dto.gstNumber || null,
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
          ...(dto.clinicName !== undefined && { clinicName: dto.clinicName }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.contactNumber !== undefined && { contactNumber: dto.contactNumber }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.gstNumber !== undefined && { gstNumber: dto.gstNumber }),
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

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
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
}

