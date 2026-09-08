# Notifications & WhatsApp Meta Cloud API Setup Guide

This document explains how to configure and operate the notification and messaging system in Ewa Derma Clinic Management System, with full Meta WhatsApp Cloud API integration.

---

## 1. Architecture & Pluggable Adapter Pattern

The notification module decouples business logic from specific transport providers using the `NotificationAdapter` pattern:
- **`EmailAdapter`**: Uses `nodemailer` to dispatch branded email messages with attached PDF invoices or prescriptions.
- **`WhatsAppAdapter`**: Connects directly to Meta's WhatsApp Cloud API (`https://graph.facebook.com/{version}/{phoneNumberId}/messages`) with automatic international phone number formatting, template payload mapping, and honest failure logging.

All dispatches — whether successful or failed — are logged in the PostgreSQL `notifications` table for auditing and compliance.

---

## 2. Meta WhatsApp Cloud API Configuration

### Step-by-Step Meta Setup
1. **Meta Business Account**: Create or log in to your [Meta Business Suite](https://business.facebook.com/).
2. **WhatsApp App**: In the [Meta for Developers Portal](https://developers.facebook.com/), create an app (Type: **Business**) and add the **WhatsApp** product.
3. **Phone Number ID & WhatsApp Business Account ID (WABA)**:
   - Go to **WhatsApp > API Setup** to find your **Phone Number ID** and **WhatsApp Business Account ID**.
   - For initial testing, you can use Meta's test sandbox number.
4. **Access Token**:
   - For production, generate a **Permanent System User Access Token** in Meta Business Manager under **Business Settings > Users > System Users** with permissions `whatsapp_business_messaging` and `whatsapp_business_management`.
   - Temporary tokens from API Setup expire after 24 hours (for test only).
5. **Approved Message Templates**:
   - Go to **WhatsApp > Message Templates** and create the template below.

---

## 3. Approved Meta Message Templates

### Patient Registration Confirmation Template
- **Template Name**: `patient_registration_confirmation`
- **Category**: `UTILITY`
- **Language**: `en` (English)
- **Header**: *None*
- **Body Text**:
  > `Welcome to Ewa Derma Clinic, {{1}}! Your registration is confirmed. Patient ID: {{2}}. For appointments, call +91 9120854977.`
- **Variables**:
  - `{{1}}` = Patient Full Name (e.g. "Rahul Sharma")
  - `{{2}}` = Clinic Patient ID (e.g. "P-1001")

> **Important**: Meta Cloud API strictly requires template wording and variable counts to match what was approved. Template name and categories are configured in `backend/src/notifications/templates/notification.templates.ts`.

---

## 4. Environment Variables (`backend/.env`)

Add the following variables to `backend/.env`:

```env
# Meta WhatsApp Cloud API Configuration
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_ACCESS_TOKEN="EAAxxxxxx..."
WHATSAPP_BUSINESS_ACCOUNT_ID="123456789012345"
WHATSAPP_API_VERSION="v21.0"

# Optional: Override base API URL for custom proxies or mock servers
# WHATSAPP_API_URL="https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID/messages"

# SMTP Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@ewaderma.com
SMTP_PASS=your-app-password
SMTP_FROM="Ewa Derma Clinic <notifications@ewaderma.com>"
```

### Unconfigured / Missing Credentials Behavior
- If `WHATSAPP_PHONE_NUMBER_ID` or `WHATSAPP_ACCESS_TOKEN` is missing, the system will **never fake success**.
- It records an honest log entry in `notifications` table with status `FAILED` and error `"WhatsApp isn't connected yet (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID missing in clinic configuration)"`.

---

## 5. Automatic Triggers & Fire-and-Forget Architecture

### Patient Registration
- Whenever a new patient is registered via `POST /api/patients` (`PatientsService.create`), a WhatsApp confirmation is triggered automatically.
- **Fire-and-Forget Guarantee**: The notification dispatch runs asynchronously without blocking or delaying the receptionist's response. Even if Meta's API is unreachable or returns an error, patient creation succeeds with 100% reliability.

### Appointment Reminders Schedule
- Automated hourly cron job (`@Cron(CronExpression.EVERY_HOUR)`) scans for appointments in the next 24 hours.
- Duplicate prevention verifies no `SENT` notification exists for that appointment before dispatching.

---

## 6. Phone Number Formatting Rules

The utility `formatWhatsAppNumber` in `backend/src/notifications/utils/phone-formatter.util.ts` normalizes all recipient numbers:
- Local 10-digit Indian numbers (`9876543210`) $\rightarrow$ `919876543210`
- Numbers with leading 0 (`09876543210`) $\rightarrow$ `919876543210`
- International format with `+91` (`+91 98765 43210`) $\rightarrow$ `919876543210`
- Raw digits only, no `+` or spaces as mandated by Meta Cloud API.
- Malformed inputs are rejected gracefully with a `FAILED` audit record without crashing the application.

---

## 7. Verification & Testing

### Run Backend Unit & Integration Tests
```bash
cd backend
npm test
```

Specific test suites:
```bash
# Phone formatter utility tests
npx jest src/notifications/utils/phone-formatter.util.spec.ts

# WhatsApp Adapter Meta Cloud API tests
npx jest src/notifications/adapters/whatsapp.adapter.spec.ts

# Patient Registration WhatsApp Trigger integration tests
npx jest src/patients/patients-notification.spec.ts
```

### Manual Testing with Real/Sandbox WhatsApp Number
1. Set valid `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` in `backend/.env`.
2. Register a new patient in the UI (`/patients`) with your test mobile number.
3. Observe the WhatsApp message delivery on your phone.
4. Check the **Notification Audit Log** (`/notifications`) to inspect the delivered `SENT` record and Meta `wamid` message ID.
