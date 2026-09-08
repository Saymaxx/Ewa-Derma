import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;
  let authService: AuthService;

  const mockSettings = {
    id: 'setting-1',
    clinicName: 'Ewa Derma Clinic',
    address: 'Bangalore',
    contactNumber: '+91 9120854977',
    email: 'contact@ewaderma.com',
    gstNumber: '29ABCDE1234F1Z5',
    taxRate: 18.0,
    openingTime: '10:00',
    closingTime: '19:00',
    operatingDays: 'Mon,Tue,Wed,Thu,Fri,Sat',
    slotDuration: 30,
    logoUrl: '/ewa-derma-logo.jpg',
  };

  const mockPrisma = {
    clinicSetting: {
      findFirst: jest.fn().mockResolvedValue(mockSettings),
      create: jest.fn().mockResolvedValue(mockSettings),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockSettings, ...data })),
    },
  };

  const mockAuthService = {
    invalidateClinicCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get clinic settings', async () => {
    const result = await service.getClinicSettings();
    expect(result).toEqual(mockSettings);
    expect(mockPrisma.clinicSetting.findFirst).toHaveBeenCalled();
  });

  it('should update clinic settings and invalidate cache', async () => {
    const updateDto = { clinicName: 'Ewa Derma Skin Clinic', contactNumber: '+91 99999 88888' };
    const result = await service.updateClinicSettings(updateDto);
    expect(result.clinicName).toEqual('Ewa Derma Skin Clinic');
    expect(mockAuthService.invalidateClinicCache).toHaveBeenCalled();
  });
});
