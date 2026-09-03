import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  NotificationAdapter,
  SendNotificationOptions,
  NotificationResult,
} from '../interfaces/notification-adapter.interface';

@Injectable()
export class EmailAdapter implements NotificationAdapter {
  private readonly logger = new Logger(EmailAdapter.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Email Transporter initialized (${host}:${port})`);
    } else {
      // Dev / Test Mode: Create a test stream transporter so email send attempts succeed in tests
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.logger.warn(
        'SMTP credentials not supplied in .env — EmailAdapter running in Stream JSON test mode',
      );
    }
  }

  async send(options: SendNotificationOptions): Promise<NotificationResult> {
    try {
      if (!options.recipient || !options.recipient.includes('@')) {
        return {
          success: false,
          error: `Invalid email address: ${options.recipient}`,
        };
      }

      const fromAddress =
        this.configService.get<string>('SMTP_FROM') ||
        '"Ewa Derma Clinic" <notifications@ewaderma.com>';

      const mailOptions: nodemailer.SendMailOptions = {
        from: fromAddress,
        to: options.recipient,
        subject: options.subject || 'Notification from Ewa Derma Clinic',
        text: options.content,
        html: options.content.replace(/\n/g, '<br/>'),
      };

      if (options.pdfBuffer) {
        mailOptions.attachments = [
          {
            filename: options.pdfFilename || 'document.pdf',
            content: Buffer.from(options.pdfBuffer),
            contentType: 'application/pdf',
          },
        ];
      }

      const info = await this.transporter!.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${options.recipient} [ID: ${info.messageId}]`);

      return {
        success: true,
        messageId: info.messageId || `msg-${Date.now()}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${options.recipient}: ${err.message}`);
      return {
        success: false,
        error: err.message || 'SMTP delivery failure',
      };
    }
  }
}
