# Phase 6: Notifications & Communication Setup Guide

This document explains how to configure and operate the pluggable notification and messaging system in Ewa Derma Clinic Management System.

---

## 1. Architecture & Pluggable Adapter Pattern

The notification module decouples business logic from specific transport providers using the `NotificationAdapter` pattern:
- **`EmailAdapter`**: Uses `nodemailer` to dispatch branded email messages with attached PDF invoices or prescriptions.
- **`WhatsAppAdapter`**: Sends WhatsApp messages via WhatsApp Business API / Twilio gateway with honest failure handling when unconfigured.

All dispatches — whether successful or failed — are logged in the PostgreSQL `notifications` table for auditing and compliance.

---

## 2. Environment Configuration (`backend/.env`)

### SMTP Email Configuration
Add the following variables to `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@ewaderma.com
SMTP_PASS=your-app-password
SMTP_FROM="Ewa Derma Clinic <notifications@ewaderma.com>"
```
*Note: In development or test environments where `SMTP_HOST` is omitted, `EmailAdapter` safely simulates sending and logs successful delivery without throwing errors.*

### WhatsApp Business API Configuration
```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages
WHATSAPP_API_KEY=EAA...your_bearer_token...
```
*Note: If WhatsApp credentials are absent, `WhatsAppAdapter` reports `success: false` and logs status `FAILED` in the database with error details (`"WhatsApp isn't connected yet"`), ensuring no false delivery reports.*

---

## 3. Automated Appointment Reminders Schedule

Appointment reminders run on an automated periodic schedule using `@nestjs/schedule` (`@Cron(CronExpression.EVERY_HOUR)`):
- **Window**: Searches for appointments occurring in the next 24 hours with status `SCHEDULED` or `CONFIRMED`.
- **Duplicate Prevention**: Before sending, checks the `notifications` table for existing `APPOINTMENT_REMINDER` entries with status `SENT` for the specific appointment ID. If found, skips dispatch to prevent spamming patients.

### Manual Reminder Trigger
Admins can manually trigger the reminders job at any time:
- **API**: `POST /api/notifications/run-reminders`
- **UI**: Navigate to `/notifications` and click **Trigger Reminders Job**.

---

## 4. Admin Audit Log Screen (`/notifications`)

Admins can view and filter all outgoing clinic communications:
- **Metrics**: Total logs, Delivered count, Delivery failures count, Deliverability rate (%).
- **Filters**: Search by recipient or content, filter by Channel (`EMAIL`/`WHATSAPP`), Type (`INVOICE_SENT`, `PRESCRIPTION_SENT`, `APPOINTMENT_REMINDER`), or Status (`SENT`/`FAILED`).
- **Error Inspector**: Click **Inspect Error** on failed attempts to view the detailed stack trace or API error response.

---

## 5. Verification & Testing

- **Backend Unit Tests**:
  ```bash
  cd backend
  npm test
  ```
- **Live E2E Verification**:
  ```bash
  cd backend
  node src/notifications/test-notifications-api.js
  ```
