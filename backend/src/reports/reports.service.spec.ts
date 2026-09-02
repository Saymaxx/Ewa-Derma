import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsReportService } from './appointments-report.service';
import { PatientsReportService } from './patients-report.service';
import { ReportExporterService } from './report-exporter.service';

describe('ReportsModule Services', () => {
  let appointmentsReportService: AppointmentsReportService;
  let patientsReportService: PatientsReportService;
  let reportExporterService: ReportExporterService;

  const mockPrismaService = {
    appointment: {
      findMany: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
    },
    doctor: {
      findMany: jest.fn(),
    },
    consultation: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsReportService,
        PatientsReportService,
        ReportExporterService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appointmentsReportService = module.get<AppointmentsReportService>(AppointmentsReportService);
    patientsReportService = module.get<PatientsReportService>(PatientsReportService);
    reportExporterService = module.get<ReportExporterService>(ReportExporterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AppointmentsReportService', () => {
    it('should generate appointment report metrics and breakdown', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        {
          id: 'apt-1',
          appointmentCode: 'A-2001',
          appointmentDate: new Date('2026-09-01'),
          startTime: '10:00',
          endTime: '10:30',
          status: 'COMPLETED',
          type: 'CONSULTATION',
          doctorId: 'doc-1',
          patient: {
            id: 'pt-1',
            patientCode: 'P-1001',
            firstName: 'Aarav',
            lastName: 'Gupta',
            phone: '9876543210',
          },
          doctor: {
            id: 'doc-1',
            specialization: 'Dermatologist',
            user: { firstName: 'A', lastName: 'Sharma' },
          },
        },
        {
          id: 'apt-2',
          appointmentCode: 'A-2002',
          appointmentDate: new Date('2026-09-02'),
          startTime: '11:00',
          endTime: '11:30',
          status: 'CANCELLED',
          type: 'CONSULTATION',
          doctorId: 'doc-1',
          patient: {
            id: 'pt-2',
            patientCode: 'P-1002',
            firstName: 'Ishan',
            lastName: 'Mishra',
            phone: '9876543211',
          },
          doctor: {
            id: 'doc-1',
            specialization: 'Dermatologist',
            user: { firstName: 'A', lastName: 'Sharma' },
          },
        },
      ]);

      mockPrismaService.doctor.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          specialization: 'Dermatologist',
          user: { firstName: 'A', lastName: 'Sharma' },
        },
      ]);

      const result = await appointmentsReportService.generateAppointmentReport(
        { startDate: '2026-09-01', endDate: '2026-09-05' },
        { userId: 'admin-1', roles: ['ADMIN'] },
      );

      expect(result.summary.total).toBe(2);
      expect(result.summary.completed).toBe(1);
      expect(result.summary.cancelled).toBe(1);
      expect(result.summary.completionRate).toBe(50);
      expect(result.doctorBreakdown).toHaveLength(1);
      expect(result.doctorBreakdown[0].doctorName).toBe('Dr. A Sharma');
    });

    it('should scope appointments to logged-in doctor if role is DOCTOR', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([]);
      mockPrismaService.doctor.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          specialization: 'Dermatologist',
          user: { firstName: 'A', lastName: 'Sharma' },
        },
      ]);

      await appointmentsReportService.generateAppointmentReport(
        { startDate: '2026-09-01', endDate: '2026-09-05' },
        { userId: 'doc-user-1', roles: ['DOCTOR'], doctorId: 'doc-1' },
      );

      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'doc-1',
          }),
        }),
      );
    });
  });

  describe('PatientsReportService', () => {
    it('should generate new, returning, and follow-up patient metrics', async () => {
      mockPrismaService.patient.findMany
        .mockResolvedValueOnce([
          {
            id: 'pt-1',
            patientCode: 'P-1001',
            firstName: 'Aarav',
            lastName: 'Gupta',
            phone: '9876543210',
            gender: 'Male',
            age: 28,
            createdAt: new Date('2026-09-01'),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'pt-1',
            patientCode: 'P-1001',
            firstName: 'Aarav',
            lastName: 'Gupta',
            phone: '9876543210',
            createdAt: new Date('2026-09-01'),
            _count: { appointments: 3 },
          },
        ]);

      mockPrismaService.appointment.findMany.mockResolvedValue([
        { patientId: 'pt-1' },
      ]);

      mockPrismaService.consultation.findMany.mockResolvedValue([
        {
          id: 'c-1',
          diagnosis: 'Acne Vulgaris',
          followUpDate: new Date('2026-09-10'),
          patient: {
            id: 'pt-1',
            patientCode: 'P-1001',
            firstName: 'Aarav',
            lastName: 'Gupta',
            phone: '9876543210',
          },
          appointment: {
            doctor: {
              user: { firstName: 'A', lastName: 'Sharma' },
            },
          },
        },
      ]);

      const result = await patientsReportService.generatePatientReport(
        { startDate: '2026-09-01', endDate: '2026-09-05' },
        { userId: 'admin-1', roles: ['ADMIN'] },
      );

      expect(result.summary.totalNewPatients).toBe(1);
      expect(result.summary.totalReturningPatients).toBe(1);
      expect(result.summary.pendingFollowUps).toBe(1);
      expect(result.newPatients[0].patientCode).toBe('P-1001');
    });
  });

  describe('ReportExporterService', () => {
    const sampleData = {
      dateRange: { startDate: '2026-09-01', endDate: '2026-09-05' },
      summary: { total: 2, completed: 1, completionRate: 50, cancelled: 1, noShow: 0 },
      items: [
        {
          appointmentCode: 'A-2001',
          appointmentDate: '2026-09-01',
          startTime: '10:00',
          endTime: '10:30',
          patientCode: 'P-1001',
          patientName: 'Aarav Gupta',
          patientPhone: '9876543210',
          doctorName: 'Dr. A Sharma',
          type: 'CONSULTATION',
          status: 'COMPLETED',
        },
      ],
    };

    it('should export PDF report buffer', async () => {
      const res = await reportExporterService.exportAppointmentReport(sampleData, 'pdf');
      expect(res.mimeType).toBe('application/pdf');
      expect(res.buffer).toBeInstanceOf(Buffer);
      expect(res.buffer.length).toBeGreaterThan(100);
    });

    it('should export CSV report buffer', async () => {
      const res = await reportExporterService.exportAppointmentReport(sampleData, 'csv');
      expect(res.mimeType).toBe('text/csv');
      expect(res.buffer.toString('utf-8')).toContain('EWA DERMA CLINIC - APPOINTMENTS REPORT');
    });

    it('should export Excel report buffer', async () => {
      const res = await reportExporterService.exportAppointmentReport(sampleData, 'excel');
      expect(res.mimeType).toBe('application/vnd.ms-excel');
      expect(res.buffer.toString('utf-8')).toContain('A-2001');
    });
  });
});
