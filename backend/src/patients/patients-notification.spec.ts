import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel, NotificationType } from '@prisma/client';

describe('PatientsService - WhatsApp Notification Trigger', () => {
  let patientsService: PatientsService;
  let notificationsService: NotificationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    patient: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockEntityIdService = {
    generateNextId: jest.fn().mockResolvedValue('P-1005'),
  };

  const mockNotificationsService = {
    dispatch: jest.fn().mockResolvedValue({ id: 'notif-1', status: 'SENT' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EntityIdService, useValue: mockEntityIdService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    patientsService = module.get<PatientsService>(PatientsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger WhatsApp registration confirmation notification upon patient creation', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(null);
    mockPrisma.patient.create.mockResolvedValue({
      id: 'patient-uuid-1',
      patientCode: 'P-1005',
      firstName: 'Ananya',
      lastName: 'Pandey',
      phone: '9876543210',
      email: 'ananya@example.com',
    });

    const result = await patientsService.create({
      firstName: 'Ananya',
      lastName: 'Pandey',
      phone: '9876543210',
      email: 'ananya@example.com',
    });

    expect(result).toBeDefined();
    expect(result.patientCode).toBe('P-1005');

    // Verify WhatsApp dispatch was called with correct parameters
    expect(mockNotificationsService.dispatch).toHaveBeenCalledTimes(1);
    expect(mockNotificationsService.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.WHATSAPP,
        type: NotificationType.PATIENT_REGISTRATION,
        recipient: '9876543210',
        templateName: 'patient_registration_confirmation',
        templateParameters: ['Ananya Pandey', 'P-1005'],
        relatedEntity: 'PATIENT',
        relatedEntityId: 'patient-uuid-1',
      }),
    );
  });

  it('should succeed creating patient even if WhatsApp notification dispatch rejects (fire-and-forget isolation)', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(null);
    mockPrisma.patient.create.mockResolvedValue({
      id: 'patient-uuid-2',
      patientCode: 'P-1006',
      firstName: 'Rohan',
      lastName: 'Kapoor',
      phone: '9876500000',
    });

    // Mock notification dispatch rejection
    mockNotificationsService.dispatch.mockRejectedValueOnce(
      new Error('Meta Graph API rate limit exceeded'),
    );

    // Patient creation must still resolve normally
    const result = await patientsService.create({
      firstName: 'Rohan',
      lastName: 'Kapoor',
      phone: '9876500000',
    });

    expect(result).toBeDefined();
    expect(result.patientCode).toBe('P-1006');
    expect(result.firstName).toBe('Rohan');
  });

  it('should gracefully skip WhatsApp notification if patient has no phone number', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(null);
    mockPrisma.patient.create.mockResolvedValue({
      id: 'patient-uuid-3',
      patientCode: 'P-1007',
      firstName: 'No',
      lastName: 'Phone',
      phone: '',
    });

    const result = await patientsService.create({
      firstName: 'No',
      lastName: 'Phone',
      phone: '',
    });

    expect(result).toBeDefined();
    expect(mockNotificationsService.dispatch).not.toHaveBeenCalled();
  });
});
