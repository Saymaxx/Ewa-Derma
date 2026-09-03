import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationAdapter,
  SendNotificationOptions,
  NotificationResult,
} from '../interfaces/notification-adapter.interface';

@Injectable()
export class WhatsAppAdapter implements NotificationAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async send(options: SendNotificationOptions): Promise<NotificationResult> {
    const apiUrl = this.configService.get<string>('WHATSAPP_API_URL');
    const apiKey = this.configService.get<string>('WHATSAPP_API_KEY');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    // Rule #6: Never fake a successful send — if credentials aren't configured, report honest failure
    if (!apiUrl || !apiKey) {
      this.logger.warn(
        `WhatsApp send attempt to ${options.recipient} failed: API credentials not configured`,
      );
      return {
        success: false,
        error:
          "WhatsApp isn't connected yet (WHATSAPP_API_KEY / WHATSAPP_API_URL missing in clinic configuration)",
      };
    }

    try {
      this.logger.log(`Dispatching WhatsApp message to ${options.recipient} via ${apiUrl}...`);

      // Real provider API call template (e.g. Meta Graph API / Twilio)
      const res = await fetch(`${apiUrl}/${phoneNumberId || 'me'}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: options.recipient,
          type: 'text',
          text: { body: options.content },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`WhatsApp Provider API returned status ${res.status}: ${errorText}`);
        return {
          success: false,
          error: `WhatsApp Provider API Error (HTTP ${res.status}): ${errorText}`,
        };
      }

      const data: any = await res.json();
      return {
        success: true,
        messageId: data.messages?.[0]?.id || `wa-${Date.now()}`,
      };
    } catch (err: any) {
      this.logger.error(`WhatsApp dispatch exception: ${err.message}`);
      return {
        success: false,
        error: err.message || 'WhatsApp network transport failure',
      };
    }
  }
}
