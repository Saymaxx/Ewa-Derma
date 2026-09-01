import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RoleName } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let auditLogService: AuditLogService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    clinicSetting: {
      findFirst: jest.fn(),
    },
  };

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('mocked_jwt_token'),
    verify: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultVal: any) => defaultVal),
  };

  const mockAuditLog = {
    log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    getRecentLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully authenticate user with valid password and return tokens', async () => {
      const password = 'Clinic@12345';
      const passwordHash = await argon2.hash(password);

      const mockUser = {
        id: 'usr-1',
        email: 'admin@ewaderma.com',
        username: 'admin',
        passwordHash,
        firstName: 'Clinic',
        lastName: 'Admin',
        phoneNumber: '0120-5244840',
        isActive: true,
        userRoles: [{ role: { name: RoleName.ADMIN } }],
        doctor: null,
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'ref-1' });

      const result = await service.login({ identifier: 'admin@ewaderma.com', password });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('admin@ewaderma.com');
      expect(result.user.roles).toContain(RoleName.ADMIN);
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS', userId: 'usr-1' }),
      );
    });

    it('should reject login if user is not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ identifier: 'unknown@ewaderma.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED' }),
      );
    });

    it('should reject login with wrong password', async () => {
      const validHash = await argon2.hash('CorrectPassword');
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'usr-2',
        email: 'dr@ewaderma.com',
        passwordHash: validHash,
        isActive: true,
        userRoles: [{ role: { name: RoleName.DOCTOR } }],
      });

      await expect(
        service.login({ identifier: 'dr@ewaderma.com', password: 'IncorrectPassword' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED', userId: 'usr-2' }),
      );
    });
  });

  describe('logout', () => {
    it('should revoke all refresh tokens on logout and log event', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.logout('usr-1');

      expect(result.message).toContain('Logged out successfully');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr-1' },
        data: { isRevoked: true },
      });
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT', userId: 'usr-1' }),
      );
    });
  });
});
