import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto';

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
}
