import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName, AppointmentStatus } from '@prisma/client';

describe('ConsultationsService', () => {
  let service: ConsultationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    consultation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    doctor: {
      findUnique: jest.fn(),
    },
    appointmentStatusHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ConsultationsService>(ConsultationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create consultation', () => {
    const validDto = {
      appointmentId: 'apt-1',
      patientId: 'pt-1',
      chiefComplaint: 'Facial acne breakout',
      symptoms: 'Papules and erythema',
      clinicalFindings: 'Moderate acne vulgaris',
      treatmentPlan: 'Topical retinoid + sun protection',
      doctorNotes: 'CONFIDENTIAL: Patient is prone to keloid scarring',
      diagnoses: [{ conditionName: 'Acne Vulgaris', severity: 'Moderate' }],
    };

    it('should create consultation and automatically transition appointment to COMPLETED', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'apt-1',
        doctorId: 'doc-1',
        status: AppointmentStatus.IN_CONSULTATION,
        patient: { patientCode: 'P-1001' },
      });
      mockPrisma.consultation.findUnique.mockResolvedValue(null); // No existing consultation

      const createdConsultation = {
        id: 'cons-1',
        ...validDto,
        doctorId: 'doc-1',
        doctor: { user: { firstName: 'A', lastName: 'Sharma' } },
        patient: { patientCode: 'P-1001' },
      };

      mockPrisma.consultation.create.mockResolvedValue(createdConsultation);

      const result = await service.create(validDto, {
        id: 'user-doc-1',
        email: 'doctor@ewaderma.com',
        roles: [RoleName.DOCTOR],
      });

      expect(mockPrisma.consultation.create).toHaveBeenCalled();
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt-1' },
          data: expect.objectContaining({ status: AppointmentStatus.COMPLETED }),
        }),
      );
      expect(mockPrisma.appointmentStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toStatus: AppointmentStatus.COMPLETED,
          }),
        }),
      );
      expect(result.id).toBe('cons-1');
    });
  });

  describe('Doctor Notes Privacy Enforcement (API level)', () => {
    const mockConsultationRecord = {
      id: 'cons-1',
      patientId: 'pt-1',
      chiefComplaint: 'Severe Eczema',
      doctorNotes: 'PRIVATE DOCTOR NOTE: Suspected contact dermatitis from chemical peel',
      diagnoses: [{ conditionName: 'Eczema' }],
      doctor: { user: { firstName: 'A', lastName: 'Sharma' } },
    };

    it('should STRIP doctorNotes when requested by RECEPTIONIST', async () => {
      mockPrisma.consultation.findMany.mockResolvedValue([mockConsultationRecord]);

      const result = await service.findByPatient('pt-1', [RoleName.RECEPTIONIST]);

      expect(result).toHaveLength(1);
      expect(result[0].chiefComplaint).toBe('Severe Eczema');
      expect(result[0].doctorNotes).toBeNull(); // PROOF: doctorNotes is stripped!
    });

    it('should STRIP doctorNotes when requested by INVENTORY_MANAGER', async () => {
      mockPrisma.consultation.findMany.mockResolvedValue([mockConsultationRecord]);

      const result = await service.findByPatient('pt-1', [RoleName.INVENTORY_MANAGER]);

      expect(result[0].doctorNotes).toBeNull();
    });

    it('should INCLUDE doctorNotes when requested by DOCTOR', async () => {
      mockPrisma.consultation.findMany.mockResolvedValue([mockConsultationRecord]);

      const result = await service.findByPatient('pt-1', [RoleName.DOCTOR]);

      expect(result[0].doctorNotes).toBe('PRIVATE DOCTOR NOTE: Suspected contact dermatitis from chemical peel');
    });

    it('should INCLUDE doctorNotes when requested by ADMIN', async () => {
      mockPrisma.consultation.findMany.mockResolvedValue([mockConsultationRecord]);

      const result = await service.findByPatient('pt-1', [RoleName.ADMIN]);

      expect(result[0].doctorNotes).toBe('PRIVATE DOCTOR NOTE: Suspected contact dermatitis from chemical peel');
    });
  });
});
