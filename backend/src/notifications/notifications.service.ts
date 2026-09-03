import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailAdapter } from './adapters/email.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { NotificationChannel, NotificationType, NotificationStatus } from '@prisma/client';
import { SendNotificationOptions } from './interfaces/notification-adapter.interface';

export interface DispatchNotificationDto {
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  templateName?: string;
  subject?: string;
  content: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  pdfBuffer?: Buffer | Uint8Array;
  pdfFilename?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailAdapter: EmailAdapter,
    private readonly whatsAppAdapter: WhatsAppAdapter,
  ) {}

  async dispatch(dto: DispatchNotificationDto) {
    // 1. Create PENDING notification record in database
    const notification = await this.prisma.notification.create({
      data: {
        channel: dto.channel,
        type: dto.type,
        recipient: dto.recipient.trim(),
        templateName: dto.templateName || 'custom',
        subject: dto.subject || null,
        content: dto.content,
        relatedEntity: dto.relatedEntity || null,
        relatedEntityId: dto.relatedEntityId || null,
        status: NotificationStatus.PENDING,
      },
    });

    // 2. Select Adapter based on channel
    const adapter = dto.channel === NotificationChannel.EMAIL ? this.emailAdapter : this.whatsAppAdapter;

    const options: SendNotificationOptions = {
      recipient: dto.recipient.trim(),
      subject: dto.subject,
      content: dto.content,
      pdfBuffer: dto.pdfBuffer,
      pdfFilename: dto.pdfFilename,
    };

    // 3. Dispatch via selected adapter
    const result = await adapter.send(options);

    // 4. Update notification log row with final status & error detail
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        sentAt: result.success ? new Date() : null,
        errorLog: result.error || null,
      },
    });

    if (!result.success) {
      this.logger.warn(`Notification dispatch failed [ID: ${updated.id}]: ${result.error}`);
    } else {
      this.logger.log(`Notification dispatched successfully [ID: ${updated.id}] to ${dto.recipient}`);
    }

    return updated;
  }

  async getHistory(relatedEntity: string, relatedEntityId: string) {
    return this.prisma.notification.findMany({
      where: {
        relatedEntity: relatedEntity.toUpperCase(),
        relatedEntityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(
    search?: string,
    status?: NotificationStatus,
    type?: NotificationType,
    channel?: NotificationChannel,
    limit: number = 50,
  ) {
    const where: any = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (channel) where.channel = channel;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { recipient: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { errorLog: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, limit),
    });
  }
}
