import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PdfService } from './pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { PrescriptionStatus, RoleName } from '@prisma/client';

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let prisma: PrismaService;
  let entityIdService: EntityIdService;
  let pdfService: PdfService;

  const mockPrisma = {
    consultation: {
      findUnique: jest.fn(),
    },
    prescription: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    clinicSetting: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  };

  const mockEntityIdService = {
    generateNextId: jest.fn(),
  };

  const mockPdfService = {
    generatePrescriptionPdf: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EntityIdService, useValue: mockEntityIdService },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
    prisma = module.get<PrismaService>(PrismaService);
    entityIdService = module.get<EntityIdService>(EntityIdService);
    pdfService = module.get<PdfService>(PdfService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create prescription', () => {
    const validDto = {
      consultationId: 'cons-1',
      patientId: 'pt-1',
      generalAdvice: 'Apply sunscreen regularly',
      items: [
        {
          medicineName: 'Tretinoin 0.05% Gel',
          dosage: '0.05%',
          frequency: '0-0-1 (Night)',
          duration: '30 days',
          route: 'Topical',
          quantity: 1,
        },
      ],
    };

    it('should generate sequential RX-3001 code and create version 1 prescription', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue({
        id: 'cons-1',
        doctorId: 'doc-1',
        patient: { patientCode: 'P-1001' },
      });
      mockEntityIdService.generateNextId.mockResolvedValue('RX-3001');

      const createdRecord = {
        id: 'rx-1',
        prescriptionCode: 'RX-3001',
        version: 1,
        status: PrescriptionStatus.ACTIVE,
        ...validDto,
      };

      mockPrisma.prescription.create.mockResolvedValue(createdRecord);

      const result = await service.create(validDto, {
        id: 'user-doc-1',
        email: 'doctor@ewaderma.com',
        roles: [RoleName.DOCTOR],
      });

      expect(mockEntityIdService.generateNextId).toHaveBeenCalledWith('RX');
      expect(result.prescriptionCode).toBe('RX-3001');
      expect(result.version).toBe(1);
      expect(result.status).toBe(PrescriptionStatus.ACTIVE);
    });
  });

  describe('Mandatory Prescription Versioning', () => {
    it('should create version 2, reference parent, and mark old version as SUPERSEDED', async () => {
      const existingV1 = {
        id: 'rx-1',
        prescriptionCode: 'RX-3001',
        consultationId: 'cons-1',
        patientId: 'pt-1',
        doctorId: 'doc-1',
        version: 1,
        status: PrescriptionStatus.ACTIVE,
        generalAdvice: 'Initial advice',
      };

      mockPrisma.prescription.findUnique.mockResolvedValue(existingV1);

      const v2Dto = {
        generalAdvice: 'Revised dosage advice',
        items: [
          {
            medicineName: 'Tretinoin 0.025% Gel',
            dosage: '0.025%',
            frequency: '0-0-1 (Night)',
            duration: '45 days',
            route: 'Topical',
            quantity: 1,
          },
        ],
      };

      const updatedV1 = { ...existingV1, status: PrescriptionStatus.SUPERSEDED };
      const createdV2 = {
        id: 'rx-2',
        prescriptionCode: 'RX-3001',
        version: 2,
        parentPrescriptionId: 'rx-1',
        status: PrescriptionStatus.ACTIVE,
      };

      mockPrisma.prescription.update.mockResolvedValue(updatedV1);
      mockPrisma.prescription.create.mockResolvedValue(createdV2);

      const result = await service.createVersion('rx-1', v2Dto, {
        id: 'user-doc-1',
        email: 'doctor@ewaderma.com',
        roles: [RoleName.DOCTOR],
      });

      expect(mockPrisma.prescription.update).toHaveBeenCalledWith({
        where: { id: 'rx-1' },
        data: { status: PrescriptionStatus.SUPERSEDED },
      });
      expect(mockPrisma.prescription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 2,
            parentPrescriptionId: 'rx-1',
            status: PrescriptionStatus.ACTIVE,
          }),
        }),
      );
      expect(result.version).toBe(2);
    });

    it('should reject editing a prescription that is already SUPERSEDED', async () => {
      const supersededRx = {
        id: 'rx-1',
        version: 1,
        status: PrescriptionStatus.SUPERSEDED,
      };

      mockPrisma.prescription.findUnique.mockResolvedValue(supersededRx);

      await expect(
        service.createVersion('rx-1', { items: [] }, {
          id: 'user-doc-1',
          email: 'doctor@ewaderma.com',
          roles: [RoleName.DOCTOR],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getVersions', () => {
    it('should retrieve full version history list for a prescription', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'rx-2',
        prescriptionCode: 'RX-3001',
      } as any);

      mockPrisma.prescription.findMany.mockResolvedValue([
        { id: 'rx-2', prescriptionCode: 'RX-3001', version: 2, status: PrescriptionStatus.ACTIVE },
        { id: 'rx-1', prescriptionCode: 'RX-3001', version: 1, status: PrescriptionStatus.SUPERSEDED },
      ]);

      const result = await service.getVersions('rx-2');

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
      expect(result[1].version).toBe(1);
    });
  });
});
