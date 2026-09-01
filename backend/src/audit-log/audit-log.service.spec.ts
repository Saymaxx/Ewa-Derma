import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: PrismaService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should write an audit log entry', async () => {
    const logData = {
      userId: 'usr-123',
      action: 'LOGIN_SUCCESS',
      entityName: 'AUTH',
      entityId: 'usr-123',
      details: { ip: '127.0.0.1' },
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    };

    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1', ...logData });

    const result = await service.log(logData);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'usr-123',
        action: 'LOGIN_SUCCESS',
        entityName: 'AUTH',
        entityId: 'usr-123',
        details: { ip: '127.0.0.1' },
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
      },
    });
    expect(result).toHaveProperty('id', 'log-1');
  });

  it('should retrieve recent audit logs', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([
      { id: '1', action: 'LOGIN_SUCCESS' },
      { id: '2', action: 'LOGIN_FAILED' },
    ]);

    const logs = await service.getRecentLogs(10);

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: expect.anything(),
    });
    expect(logs).toHaveLength(2);
  });
});
