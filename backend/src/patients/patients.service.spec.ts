import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { Gender, BloodGroup } from '@prisma/client';

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: PrismaService;
  let entityIdService: EntityIdService;

  const mockPrisma = {
    patient: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEntityIdService = {
    generateNextId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EntityIdService, useValue: mockEntityIdService },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    prisma = module.get<PrismaService>(PrismaService);
    entityIdService = module.get<EntityIdService>(EntityIdService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should generate sequential patient code P-1001 and create patient', async () => {
      mockEntityIdService.generateNextId.mockResolvedValue('P-1001');

      const dto = {
        firstName: 'Aarav',
        lastName: 'Gupta',
        phone: '9876543210',
        gender: Gender.MALE,
        bloodGroup: BloodGroup.O_POSITIVE,
      };

      const createdRecord = {
        id: 'pt-1',
        patientCode: 'P-1001',
        ...dto,
        isActive: true,
      };

      mockPrisma.patient.create.mockResolvedValue(createdRecord);

      const result = await service.create(dto);

      expect(mockEntityIdService.generateNextId).toHaveBeenCalledWith('P');
      expect(result.patientCode).toBe('P-1001');
      expect(result.firstName).toBe('Aarav');
    });
  });

  describe('search', () => {
    it('should filter patients by search query and return paginated result', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([
        { id: '1', patientCode: 'P-1001', firstName: 'Aarav', lastName: 'Gupta', phone: '9876543210' },
      ]);
      mockPrisma.patient.count.mockResolvedValue(1);

      const result = await service.search('Aarav', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            OR: expect.arrayContaining([
              { firstName: { contains: 'Aarav', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if patient does not exist', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
