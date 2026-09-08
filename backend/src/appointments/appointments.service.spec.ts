import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: PrismaService;
  let entityIdService: EntityIdService;

  const mockPrisma = {
    patient: {
      findUnique: jest.fn(),
    },
    doctor: {
      findUnique: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    appointmentStatusHistory: {
      create: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  };

  const mockEntityIdService = {
    generateNextId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EntityIdService, useValue: mockEntityIdService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get<PrismaService>(PrismaService);
    entityIdService = module.get<EntityIdService>(EntityIdService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto = {
      patientId: 'pt-1',
      doctorId: 'doc-1',
      appointmentDate: '2026-09-02',
      startTime: '10:00',
      endTime: '10:30',
      type: AppointmentType.CONSULTATION,
      reason: 'Checkup',
    };

    it('should successfully book appointment and return A-2001 code', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'pt-1', isActive: true, patientCode: 'P-1001' });
      mockPrisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-1',
        isActive: true,
        user: { firstName: 'A', lastName: 'Sharma' },
      });
      mockPrisma.appointment.findFirst.mockResolvedValue(null); // No double booking
      mockEntityIdService.generateNextId.mockResolvedValue('A-2001');

      const createdAppointment = {
        id: 'apt-1',
        appointmentCode: 'A-2001',
        ...validDto,
        status: AppointmentStatus.SCHEDULED,
      };

      mockPrisma.appointment.create.mockResolvedValue(createdAppointment);
      mockPrisma.appointmentStatusHistory.create.mockResolvedValue({ id: 'hist-1' });

      const result = await service.create(validDto, 'reception@ewaderma.com');

      expect(mockEntityIdService.generateNextId).toHaveBeenCalledWith('A');
      expect(result.appointmentCode).toBe('A-2001');
      expect(mockPrisma.appointmentStatusHistory.create).toHaveBeenCalled();
    });

    it('should reject booking and throw ConflictException if time slot is already booked', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'pt-1', isActive: true });
      mockPrisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-1',
        isActive: true,
        workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        user: { firstName: 'A', lastName: 'Sharma' },
      });
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'apt-existing', startTime: '10:00', endTime: '10:30' });

      await expect(service.create(validDto, 'reception@ewaderma.com')).rejects.toThrow(ConflictException);
    });

    it('should reject booking and throw BadRequestException if doctor is not working on that day', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'pt-1', isActive: true });
      mockPrisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-1',
        isActive: true,
        workingDays: 'Mon,Tue,Wed,Thu,Fri',
        user: { firstName: 'A', lastName: 'Sharma' },
      });

      // 2026-09-06 is Sunday
      const sundayDto = { ...validDto, appointmentDate: '2026-09-06' };
      await expect(service.create(sundayDto, 'reception@ewaderma.com')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus & State Machine', () => {
    it('should allow valid transition: SCHEDULED -> CHECKED_IN', async () => {
      const existing = {
        id: 'apt-1',
        appointmentCode: 'A-2001',
        status: AppointmentStatus.SCHEDULED,
        checkedInAt: null,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existing as any);
      mockPrisma.appointment.update.mockResolvedValue({ ...existing, status: AppointmentStatus.CHECKED_IN });
      mockPrisma.appointmentStatusHistory.create.mockResolvedValue({ id: 'hist-2' });

      const result = await service.updateStatus('apt-1', { status: AppointmentStatus.CHECKED_IN }, 'reception');

      expect(result.status).toBe(AppointmentStatus.CHECKED_IN);
    });

    it('should reject invalid transition: SCHEDULED -> COMPLETED directly with BadRequestException', async () => {
      const existing = {
        id: 'apt-1',
        appointmentCode: 'A-2001',
        status: AppointmentStatus.SCHEDULED,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existing as any);

      await expect(
        service.updateStatus('apt-1', { status: AppointmentStatus.COMPLETED }, 'reception'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transitioning from terminal state COMPLETED', async () => {
      const existing = {
        id: 'apt-1',
        appointmentCode: 'A-2001',
        status: AppointmentStatus.COMPLETED,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existing as any);

      await expect(
        service.updateStatus('apt-1', { status: AppointmentStatus.WAITING }, 'reception'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createProcedureVisit', () => {
    const validProcedureDto = {
      patientId: 'pt-1',
      doctorId: 'doc-1',
      procedureServiceId: 'svc-laser-1',
      notes: 'Session 2 of 6',
    };

    it('should create walk-in procedure visit and advance state to CHECKED_IN with full audit log', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'pt-1', isActive: true, patientCode: 'P-1001' });
      mockPrisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-1',
        isActive: true,
        user: { firstName: 'Sarah', lastName: 'Khan' },
      });
      mockPrisma.service.findUnique.mockResolvedValue({
        id: 'svc-laser-1',
        name: 'Laser Hair Reduction',
        category: 'Laser',
        isActive: true,
      });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockEntityIdService.generateNextId.mockResolvedValue('A-3001');

      const createdApt = {
        id: 'apt-proc-1',
        appointmentCode: 'A-3001',
        type: AppointmentType.PROCEDURE,
        status: AppointmentStatus.SCHEDULED,
        procedureServiceId: 'svc-laser-1',
      };

      mockPrisma.appointment.create.mockResolvedValue(createdApt);
      mockPrisma.appointment.update.mockResolvedValue({
        ...createdApt,
        status: AppointmentStatus.CHECKED_IN,
        checkedInAt: new Date(),
      });
      mockPrisma.appointmentStatusHistory.create.mockResolvedValue({ id: 'hist-proc' });

      const result = await service.createProcedureVisit(validProcedureDto, 'reception@ewaderma.com');

      expect(result.appointmentCode).toBe('A-3001');
      expect(result.status).toBe(AppointmentStatus.CHECKED_IN);
      expect(mockPrisma.appointmentStatusHistory.create).toHaveBeenCalledTimes(3); // SCHEDULED, CONFIRMED, CHECKED_IN
    });

    it('should reject procedure visit if double booking conflict occurs', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'pt-1', isActive: true });
      mockPrisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-1',
        isActive: true,
        user: { firstName: 'Sarah', lastName: 'Khan' },
      });
      mockPrisma.service.findUnique.mockResolvedValue({ id: 'svc-laser-1', isActive: true, name: 'Laser' });
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'apt-busy' });

      await expect(service.createProcedureVisit(validProcedureDto, 'reception@ewaderma.com')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject procedure visit if procedure service is not found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'pt-1', isActive: true });
      mockPrisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-1',
        isActive: true,
        user: { firstName: 'Sarah', lastName: 'Khan' },
      });
      mockPrisma.service.findUnique.mockResolvedValue(null);

      await expect(service.createProcedureVisit(validProcedureDto, 'reception@ewaderma.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProcedureServices', () => {
    it('should exclude plain consultation from procedure services list', async () => {
      mockPrisma.service.findMany.mockResolvedValue([
        { id: '1', name: 'Initial Dermatology Consultation', category: 'Consultation', isActive: true },
        { id: '2', name: 'PRP Hair Therapy', category: 'Hair', isActive: true },
        { id: '3', name: 'Chemical Peel Glow', category: 'Peels', isActive: true },
      ]);

      const result = await service.getProcedureServices();
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.name)).toEqual(['PRP Hair Therapy', 'Chemical Peel Glow']);
    });
  });
});
