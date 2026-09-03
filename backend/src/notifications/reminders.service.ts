import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationTemplates } from './templates/notification.templates';
import { NotificationChannel, NotificationType, NotificationStatus, AppointmentStatus } from '@prisma/client';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledRemindersCron() {
    this.logger.log('Executing hourly appointment reminders cron job...');
    await this.processAppointmentReminders();
  }

  async processAppointmentReminders() {
    const now = new Date();
    const targetWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

    // Query appointments in SCHEDULED or CONFIRMED status happening within reminder window
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        appointmentDate: {
          gte: now,
          lte: targetWindow,
        },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        doctor: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    this.logger.log(`Found ${appointments.length} upcoming appointment(s) in next 24 hours window`);

    let sentCount = 0;
    let skippedCount = 0;

    for (const apt of appointments) {
      // DUPLICATE PREVENTION: Check if APPOINTMENT_REMINDER was already SENT for this appointment
      const existingSent = await this.prisma.notification.findFirst({
        where: {
          type: NotificationType.APPOINTMENT_REMINDER,
          relatedEntity: 'APPOINTMENT',
          relatedEntityId: apt.id,
          status: NotificationStatus.SENT,
        },
      });

      if (existingSent) {
        this.logger.log(`Skipping appointment ${apt.appointmentCode} — Reminder already sent on ${existingSent.sentAt}`);
        skippedCount++;
        continue;
      }

      // Determine recipient & channel
      let recipient = apt.patient.email;
      let channel: NotificationChannel = NotificationChannel.EMAIL;

      if (!recipient || !recipient.includes('@')) {
        recipient = apt.patient.phone;
        channel = NotificationChannel.WHATSAPP;
      }

      if (!recipient) {
        this.logger.warn(`Cannot send reminder for appointment ${apt.appointmentCode} — No email or phone for patient`);
        continue;
      }

      const docName = apt.doctor?.user
        ? `${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`
        : 'Attending Dermatologist';

      const template = NotificationTemplates.appointmentReminder({
        patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
        doctorName: docName,
        appointmentDate: apt.appointmentDate.toISOString().split('T')[0],
        appointmentTime: `${apt.startTime} - ${apt.endTime}`,
      });

      await this.notificationsService.dispatch({
        channel,
        type: NotificationType.APPOINTMENT_REMINDER,
        recipient,
        templateName: 'appointmentReminder',
        subject: template.subject,
        content: template.content,
        relatedEntity: 'APPOINTMENT',
        relatedEntityId: apt.id,
      });

      sentCount++;
    }

    return {
      processedCount: appointments.length,
      sentCount,
      skippedCount,
    };
  }
}
