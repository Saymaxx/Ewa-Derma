# Ewa Derma Clinic Management System — Frozen API Contract

All endpoints follow the uniform API response shape:
```json
{
  "data": <Payload | null>,
  "error": <{ statusCode, message, details } | null>,
  "meta": {
    "timestamp": "2026-09-01T11:00:00.000Z",
    "path": "/api/...",
    "version": "v1.0.0"
  }
}
```

---

## 1. Authentication Endpoints

### 1.1 Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Access:** Public (Rate limited: 10 req / min)

### 1.2 Token Refresh
- **Method:** `POST`
- **Path:** `/api/auth/refresh`
- **Access:** Public (Supports refresh token rotation).

### 1.3 Current User Profile
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Access:** Authenticated (Bearer Token).

---

## 2. Doctors Module

### 2.1 List Doctors
- **Method:** `GET`
- **Path:** `/api/doctors?onlyActive=true`
- **Access:** Authenticated (`ADMIN`, `DOCTOR`, `RECEPTIONIST`)

### 2.2 Update Doctor Profile
- **Method:** `PATCH`
- **Path:** `/api/doctors/:id`
- **Access:** `ADMIN` only

---

## 3. Patients Module

### 3.1 Register Patient
- **Method:** `POST`
- **Path:** `/api/patients`
- **Access:** `ADMIN`, `RECEPTIONIST`
- **Format:** Generates sequential `P-1001` ID.

### 3.2 Search & List Patients
- **Method:** `GET`
- **Path:** `/api/patients?search=&page=1&limit=20`
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR`

### 3.3 Get Patient Profile
- **Method:** `GET`
- **Path:** `/api/patients/:id`
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR`

### 3.4 Update Patient
- **Method:** `PATCH`
- **Path:** `/api/patients/:id`
- **Access:** `ADMIN`, `RECEPTIONIST` (Doctor is read-only).

---

## 4. Appointments Module

### 4.1 Book / Create Appointment
- **Method:** `POST`
- **Path:** `/api/appointments`
- **Access:** `ADMIN`, `RECEPTIONIST`
- **Double-booking Prevention:** Enforced at database level (`409 Conflict`).

### 4.2 List & Filter Appointments
- **Method:** `GET`
- **Path:** `/api/appointments?date=&doctorId=&status=`
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR`

### 4.3 Live Waiting Queue (Today)
- **Method:** `GET`
- **Path:** `/api/appointments/queue/today?doctorId=`
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR`

### 4.4 Transition Appointment Status (State Machine)
- **Method:** `PATCH`
- **Path:** `/api/appointments/:id/status`
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR`
- **State Machine Enforcement:**
  - `SCHEDULED` → `CONFIRMED`, `CHECKED_IN`, `CANCELLED`, `NO_SHOW`
  - `CONFIRMED` → `CHECKED_IN`, `CANCELLED`, `NO_SHOW`
  - `CHECKED_IN` → `WAITING`, `IN_CONSULTATION`, `CANCELLED`
  - `WAITING` → `IN_CONSULTATION`, `CANCELLED`
  - `IN_CONSULTATION` → `COMPLETED`, `CANCELLED`
  - `COMPLETED`, `CANCELLED`, `NO_SHOW` → Terminal

---

## 5. Medicines Formulary Module (Phase 3)

### 5.1 Search Formulary
- **Method:** `GET`
- **Path:** `/api/medicines?search=&limit=20`
- **Access:** `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `INVENTORY_MANAGER`

### 5.2 Add Medicine to Formulary
- **Method:** `POST`
- **Path:** `/api/medicines`
- **Access:** `ADMIN`, `INVENTORY_MANAGER`

---

## 6. Consultations Module (Phase 3)

### 6.1 Create Consultation
- **Method:** `POST`
- **Path:** `/api/consultations`
- **Access:** `ADMIN`, `DOCTOR`
- **Behavior:** Creates consultation records, diagnoses array, and automatically transitions appointment to `COMPLETED`.
- **Request Body:**
```json
{
  "appointmentId": "appointment-uuid",
  "patientId": "patient-uuid",
  "chiefComplaint": "Severe acne breakouts and erythema",
  "symptoms": "Burning, itching",
  "clinicalFindings": "Multiple inflammatory papules and comedones",
  "treatmentPlan": "Topical retinoid + oral antibiotic course",
  "doctorNotes": "Confidential notes: Patient has keloid history",
  "followUpDate": "2026-09-20",
  "diagnoses": [
    { "conditionName": "Acne Vulgaris", "severity": "Moderate", "icdCode": "L70.0" }
  ]
}
```

### 6.2 Get Consultations for Patient
- **Method:** `GET`
- **Path:** `/api/consultations/patient/:patientId`
- **Access:** `ADMIN`, `DOCTOR`, `RECEPTIONIST`
- **Privacy Enforcement:** If caller is not `DOCTOR` or `ADMIN` (e.g. `RECEPTIONIST`), `doctorNotes` is omitted / returned as `null`.

### 6.3 Get Consultation Detail
- **Method:** `GET`
- **Path:** `/api/consultations/:id`
- **Access:** `ADMIN`, `DOCTOR`, `RECEPTIONIST`
- **Privacy Enforcement:** `doctorNotes` sanitized for Receptionist.

---

## 7. Prescriptions & PDF Module (Phase 3)

### 7.1 Create Prescription (v1)
- **Method:** `POST`
- **Path:** `/api/prescriptions`
- **Access:** `ADMIN`, `DOCTOR`
- **Format:** Generates sequential code `RX-3001` with `version: 1`, `status: ACTIVE`. Decoupled from stock deduction.
- **Request Body:**
```json
{
  "consultationId": "consultation-uuid",
  "patientId": "patient-uuid",
  "generalAdvice": "Apply sunscreen SPF 50+ regularly",
  "followUpDate": "2026-09-20",
  "items": [
    {
      "medicineName": "Tretinoin 0.05% Gel",
      "dosage": "0.05%",
      "frequency": "0-0-1 (Once at Night)",
      "duration": "30 days",
      "route": "Topical",
      "quantity": 1,
      "instructions": "Apply thin layer on lesions"
    }
  ]
}
```

### 7.2 Revise Prescription (Mandatory Versioning v2, v3)
- **Method:** `POST`
- **Path:** `/api/prescriptions/:id/version`
- **Access:** `ADMIN`, `DOCTOR`
- **Behavior:** Marks parent prescription as `SUPERSEDED`, creates new version row referencing `parentPrescriptionId`.

### 7.3 Get Prescription Versions History
- **Method:** `GET`
- **Path:** `/api/prescriptions/:id/versions`
- **Access:** `ADMIN`, `DOCTOR`, `RECEPTIONIST`
- **Response:** Returns all versions in the prescription tree.

### 7.4 Download Prescription PDF
- **Method:** `GET`
- **Path:** `/api/prescriptions/:id/pdf`
- **Access:** `ADMIN`, `DOCTOR`, `RECEPTIONIST`
- **Response:** Binary PDF stream (`Content-Type: application/pdf`) formatted with Ewa Derma letterhead.

---

## 8. Reports & Analytics Module (Phase 7a)

### 8.1 Get Appointments Analytics Report
- **Method:** `GET`
- **Path:** `/api/reports/appointments`
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR` (Doctor access is scoped to own doctorId)
- **Query Parameters:** `startDate` (ISO), `endDate` (ISO), `doctorId` (optional), `status` (optional), `type` (optional).
- **Response:** Summary metrics (total, completed, completion rate %, cancelled), daily trend, status breakdown, doctor performance breakdown, itemized appointment records.

### 8.2 Get Patients & Follow-Ups Analytics Report
- **Method:** `GET`
- **Path:** `/api/reports/patients`
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR` (Doctor access is scoped to own doctorId)
- **Query Parameters:** `startDate` (ISO), `endDate` (ISO), `doctorId` (optional).
- **Response:** Summary metrics (new registrations, returning patients >1 visit, pending follow-ups, overdue follow-ups), new patient roster, follow-up call tracking list.

### 8.3 Export Appointments Report (PDF, CSV, Excel)
- **Method:** `GET`
- **Path:** `/api/reports/appointments/export`
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR`
- **Query Parameters:** `format` (`pdf` | `csv` | `excel`), `startDate`, `endDate`, `doctorId`, `status`, `type`.
- **Response:** Downloadable file stream (`application/pdf`, `text/csv`, or `application/vnd.ms-excel`).

### 8.4 Export Patients Report (PDF, CSV, Excel)
- **Method:** `GET`
- **Path:** `/api/reports/patients/export`
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR`
- **Query Parameters:** `format` (`pdf` | `csv` | `excel`), `startDate`, `endDate`, `doctorId`.
- **Response:** Downloadable file stream (`application/pdf`, `text/csv`, or `application/vnd.ms-excel`).

---

## 9. Billing & Payments Module (Phase 4)

### 9.1 Services Catalog APIs
- **GET /api/services** — Access: All authenticated roles. Returns list of available clinic procedure services (Consultation, Laser, PRP, Chemical Peel, etc.).
- **POST /api/services** — Access: `ADMIN`. Creates a new procedure service with base price and description.
- **PATCH /api/services/:id** — Access: `ADMIN`. Updates service price, name, or active status.

### 9.2 Invoices APIs
- **POST /api/invoices** — Access: `ADMIN`, `RECEPTIONIST`. Generates invoice (`INV-5000` series) with itemized line items (services & medicines), discount validation (requires `discountReason` if discount > 0), and initial payment status calculation.
- **GET /api/invoices** — Access: `ADMIN`, `RECEPTIONIST`, `DOCTOR`. Returns filterable invoice list by `patientId`, `status`, `startDate`, `endDate`.
- **GET /api/invoices/:id** — Access: `ADMIN`, `RECEPTIONIST`, `DOCTOR`. Returns full invoice details, line items, payment history, and net balance due.
- **PATCH /api/invoices/:id/status** — Access: `ADMIN`, `RECEPTIONIST`. Transitions invoice status along valid state machine branches (`DRAFT → PENDING`, `PENDING → PARTIALLY_PAID | PAID`, `CANCELLED`).
- **GET /api/invoices/:id/pdf** — Access: `ADMIN`, `RECEPTIONIST`, `DOCTOR`. Streams printable A4 PDF invoice with Royal Purple letterhead, itemized line items, and payment status badge.

### 9.3 Payments APIs
- **POST /api/payments** — Access: `ADMIN`, `RECEPTIONIST`. Records payment against an invoice (Method: `CASH`, `UPI`, `CARD`, `BANK_TRANSFER`), updates cumulative paid amount, and automatically transitions invoice status (`PENDING → PARTIALLY_PAID → PAID`).
- **GET /api/payments/invoice/:invoiceId** — Access: `ADMIN`, `RECEPTIONIST`, `DOCTOR`. Returns payment audit log for specified invoice.

### 9.4 Refunds APIs
- **POST /api/refunds** — Access: `ADMIN` ONLY. Issues refund as a separate linked audit record against a payment, updates net paid amount, and recalculates invoice status without editing original payment history.

## 10. Inventory Management Module (Phase 5)

### 10.1 Suppliers & Vendors APIs
- **GET /api/suppliers** — Access: `ADMIN`, `INVENTORY_MANAGER`, `RECEPTIONIST`. Returns list of pharmaceutical suppliers with active filter and search.
- **POST /api/suppliers** — Access: `ADMIN`, `INVENTORY_MANAGER`. Registers a new vendor record (name, contact person, phone, email, GSTIN, address).
- **PATCH /api/suppliers/:id** — Access: `ADMIN`, `INVENTORY_MANAGER`. Updates vendor details and status.

### 10.2 Extended Formulary & Stock APIs
- **GET /api/medicines/:id/stock** — Access: All authenticated roles. Computes real-time current stock by aggregating `inventory_transactions` ledger rows, returning batch breakdown.
- **GET /api/medicines/:id/transactions** — Access: `ADMIN`, `INVENTORY_MANAGER`. Returns complete stock movement ledger history for audit investigation.
- **PATCH /api/medicines/:id** — Access: `ADMIN`, `INVENTORY_MANAGER`. Updates medicine master details (selling price, purchase cost price, MRP, minimum stock threshold).

### 10.3 Inventory Operations APIs
- **POST /api/inventory/purchases** — Access: `ADMIN`, `INVENTORY_MANAGER`. Records stock purchase receipt (Stock IN), creates/updates `MedicineBatch`, and inserts `PURCHASE_IN` transaction entry.
- **POST /api/inventory/adjustments** — Access: `ADMIN`, `INVENTORY_MANAGER`. Records manual stock adjustment or write-off (`DAMAGED_OUT`, `EXPIRED_OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`). Mandatory written reason string required.
- **POST /api/prescriptions/:id/dispense** — Access: `ADMIN`, `INVENTORY_MANAGER`, `RECEPTIONIST`. Dispenses prescription medicines using **FEFO (First-Expiry-First-Out)** logic. Validates available unexpired stock before drawing quantity; rejects over-dispensing exceeding available stock.

## 12. Complete Reports & Analytics Module (Phase 7a & 7b)

### 12.1 Appointment & Patient Reports APIs (Phase 7a)
- **GET /api/reports/appointments** — Access: `ADMIN`, `RECEPTIONIST`, `DOCTOR` (scoped). Returns booked vs completed counts, completion rate %, status distribution, and doctor performance.
- **GET /api/reports/patients** — Access: `ADMIN`, `RECEPTIONIST`, `DOCTOR` (scoped). Returns new vs returning patient counts, pending follow-ups, overdue follow-up calls, and new registration list.
- **GET /api/reports/appointments/export** — Access: `ADMIN`, `RECEPTIONIST`, `DOCTOR`. Downloads filtered appointment report in PDF, CSV, or Excel format.
- **GET /api/reports/patients/export** — Access: `ADMIN`, `RECEPTIONIST`, `DOCTOR`. Downloads filtered patient registration & follow-up report in PDF, CSV, or Excel format.

### 12.2 Revenue & Inventory Reports APIs (Phase 7b)
- **GET /api/reports/revenue** — Access: `ADMIN`, `DOCTOR` (scoped). Returns collected revenue (net of refunds), billed revenue (total invoiced), outstanding balance due, payment method breakdown (`CASH`, `UPI`, `CARD`, `BANK_TRANSFER`), doctor attribution, and top services.
- **GET /api/reports/inventory** — Access: `ADMIN`, `INVENTORY_MANAGER`. Returns total inventory valuation (reused Phase 5 cost logic), low stock items, expiring batches, top consumed medicines, and stock movement ledger history (`inventory_transactions`).
- **GET /api/reports/revenue/export** — Access: `ADMIN`, `DOCTOR`. Downloads filtered revenue report in PDF, CSV, or Excel format.
- **GET /api/reports/inventory/export** — Access: `ADMIN`, `INVENTORY_MANAGER`. Downloads filtered inventory & stock movement report in PDF, CSV, or Excel format.


