export interface SendNotificationOptions {
  recipient: string;
  subject?: string;
  content: string;
  pdfBuffer?: Buffer | Uint8Array;
  pdfFilename?: string;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface NotificationAdapter {
  send(options: SendNotificationOptions): Promise<NotificationResult>;
}
