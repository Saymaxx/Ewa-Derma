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
