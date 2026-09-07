import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationAdapter,
  SendNotificationOptions,
  NotificationResult,
} from '../interfaces/notification-adapter.interface';
import { formatWhatsAppNumber } from '../utils/phone-formatter.util';

@Injectable()
export class WhatsAppAdapter implements NotificationAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async send(options: SendNotificationOptions): Promise<NotificationResult> {
    const accessToken =
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') ||
      this.configService.get<string>('WHATSAPP_API_KEY');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v21.0';
    const customApiUrl = this.configService.get<string>('WHATSAPP_API_URL');

    // Rule #1 & #6: Never fake a successful send — if credentials aren't configured, report honest failure
    if (!accessToken || !phoneNumberId) {
      this.logger.warn(
        `WhatsApp send attempt to ${options.recipient} failed: Meta Cloud API credentials not configured (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing)`,
      );
      return {
        success: false,
        error:
          "WhatsApp isn't connected yet (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID missing in clinic configuration)",
      };
    }

    // Format phone number into WhatsApp international format (e.g. 91XXXXXXXXXX)
    const formattedRecipient = formatWhatsAppNumber(options.recipient);
    if (!formattedRecipient) {
      this.logger.warn(
        `WhatsApp send attempt failed: Malformed or invalid recipient phone number: "${options.recipient}"`,
      );
      return {
        success: false,
        error: `Invalid recipient phone number format: "${options.recipient}"`,
      };
    }

    // Construct Meta Cloud API endpoint
    const endpoint =
      customApiUrl || `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    try {
      this.logger.log(
        `Dispatching WhatsApp message to ${formattedRecipient} (original: ${options.recipient}) via ${endpoint}...`,
      );

      let payload: Record<string, any>;

      if (options.templateName) {
        // Meta Cloud API Template Message Payload
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedRecipient,
          type: 'template',
          template: {
            name: options.templateName,
            language: {
              code: options.templateLanguage || 'en',
            },
            ...(options.templateParameters && options.templateParameters.length > 0
              ? {
                  components: [
                    {
                      type: 'body',
                      parameters: options.templateParameters.map((param) => ({
                        type: 'text',
                        text: String(param),
                      })),
                    },
                  ],
                }
              : {}),
          },
        };
      } else {
        // Meta Cloud API Direct Text Message Payload
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedRecipient,
          type: 'text',
          text: {
            preview_url: false,
            body: options.content,
          },
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorDetail = `HTTP ${res.status} ${res.statusText}`;
        try {
          const errorJson: any = await res.json();
          if (errorJson?.error) {
            const metaErr = errorJson.error;
            const codeInfo = metaErr.code ? ` (#${metaErr.code}${metaErr.error_subcode ? `:${metaErr.error_subcode}` : ''})` : '';
            const detailsInfo = metaErr.error_data?.details ? ` - ${metaErr.error_data.details}` : '';
            errorDetail = `Meta WhatsApp API Error${codeInfo}: ${metaErr.message || 'Unknown error'}${detailsInfo}`;
          } else {
            errorDetail = `WhatsApp Provider API Error (HTTP ${res.status}): ${JSON.stringify(errorJson)}`;
          }
        } catch {
          const rawText = await res.text().catch(() => '');
          if (rawText) {
            errorDetail = `WhatsApp Provider API Error (HTTP ${res.status}): ${rawText}`;
          }
        }

        this.logger.error(`WhatsApp Provider API returned failure: ${errorDetail}`);
        return {
          success: false,
          error: errorDetail,
        };
      }

      const data: any = await res.json();
      const messageId = data.messages?.[0]?.id || `wa-${Date.now()}`;

      this.logger.log(`WhatsApp message sent successfully. Message ID: ${messageId}`);
      return {
        success: true,
        messageId,
      };
    } catch (err: any) {
      this.logger.error(`WhatsApp dispatch network/transport exception: ${err.message}`);
      return {
        success: false,
        error: err.message || 'WhatsApp network transport failure',
      };
    }
  }
}
