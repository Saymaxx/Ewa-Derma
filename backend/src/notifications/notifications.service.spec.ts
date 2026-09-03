import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { RemindersService } from './reminders.service';
import { EmailAdapter } from './adapters/email.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationType, NotificationStatus, AppointmentStatus } from '@prisma/client';

describe('Notifications Module Unit Tests', () => {
  let notificationsService: NotificationsService;
  let remindersService: RemindersService;
  let emailAdapter: EmailAdapter;
  let whatsAppAdapter: WhatsAppAdapter;
  let prisma: PrismaService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal?: any) => {
      if (key === 'SMTP_HOST') return null; // Dev mode
      if (key === 'WHATSAPP_API_URL') return null; // Unconfigured
      if (key === 'WHATSAPP_API_KEY') return null; // Unconfigured
      return defaultVal !== undefined ? defaultVal : null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        RemindersService,
        EmailAdapter,
        WhatsAppAdapter,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    notificationsService = module.get<NotificationsService>(NotificationsService);
    remindersService = module.get<RemindersService>(RemindersService);
    emailAdapter = module.get<EmailAdapter>(EmailAdapter);
    whatsAppAdapter = module.get<WhatsAppAdapter>(WhatsAppAdapter);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Adapter Routing & Logging', () => {
    it('should route EMAIL channel to EmailAdapter and update status to SENT', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-1', status: NotificationStatus.PENDING });
      mockPrismaService.notification.update.mockResolvedValue({ id: 'notif-1', status: NotificationStatus.SENT });

      const res = await notificationsService.dispatch({
        channel: NotificationChannel.EMAIL,
        type: NotificationType.INVOICE_SENT,
        recipient: 'patient@example.com',
        subject: 'Invoice INV-5001',
        content: 'Your invoice is attached',
      });

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          recipient: 'patient@example.com',
          status: NotificationStatus.PENDING,
        }),
      });
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ status: NotificationStatus.SENT }),
      });
      expect(res.status).toBe(NotificationStatus.SENT);
    });

    it('should fail honestly when WhatsApp credentials are missing and log FAILED status', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-2', status: NotificationStatus.PENDING });
      mockPrismaService.notification.update.mockResolvedValue({
        id: 'notif-2',
        status: NotificationStatus.FAILED,
        errorLog: "WhatsApp isn't connected yet (WHATSAPP_API_KEY / WHATSAPP_API_URL missing in clinic configuration)",
      });

      const res = await notificationsService.dispatch({
        channel: NotificationChannel.WHATSAPP,
        type: NotificationType.PRESCRIPTION_SENT,
        recipient: '9876543210',
        content: 'Your prescription is ready',
      });

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-2' },
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
          errorLog: expect.stringContaining("WhatsApp isn't connected yet"),
        }),
      });
      expect(res.status).toBe(NotificationStatus.FAILED);
    });
  });

  describe('WhatsAppAdapter Direct Unit Test', () => {
    it('should return success: false with clear error when credentials are not configured', async () => {
      const result = await whatsAppAdapter.send({
        recipient: '9876543210',
        content: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("WhatsApp isn't connected yet");
    });
  });

  describe('Appointment Reminders & Duplicate Prevention', () => {
    it('should send reminder on 1st run and skip on 2nd run (Duplicate Prevention)', async () => {
      const mockAppointment = {
        id: 'apt-101',
        appointmentCode: 'APT-1001',
        appointmentDate: new Date(),
        startTime: '10:00 AM',
        endTime: '10:30 AM',
        status: AppointmentStatus.CONFIRMED,
        patient: { firstName: 'Kabir', lastName: 'Singh', email: 'kabir@example.com', phone: '9876543210' },
        doctor: { user: { firstName: 'Ewa', lastName: 'Sharma' } },
      };

      mockPrismaService.appointment.findMany.mockResolvedValue([mockAppointment]);

      // 1st Run: No existing SENT reminder in DB
      mockPrismaService.notification.findFirst.mockResolvedValue(null);
      mockPrismaService.notification.create.mockResolvedValue({ id: 'n-rem-1', status: NotificationStatus.PENDING });
      mockPrismaService.notification.update.mockResolvedValue({ id: 'n-rem-1', status: NotificationStatus.SENT });

      const run1 = await remindersService.processAppointmentReminders();

      expect(run1.processedCount).toBe(1);
      expect(run1.sentCount).toBe(1);
      expect(run1.skippedCount).toBe(0);

      // 2nd Run: Existing SENT reminder found in DB
      mockPrismaService.notification.findFirst.mockResolvedValue({
        id: 'n-rem-1',
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      const run2 = await remindersService.processAppointmentReminders();

      expect(run2.processedCount).toBe(1);
      expect(run2.sentCount).toBe(0);
      expect(run2.skippedCount).toBe(1); // SKIPPED DUPLICATE!
    });
  });
});
