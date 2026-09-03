# Reports Module Complete Blueprint & Operations Guide

This document summarizes the complete **Reports & Analytics Module** (Phase 7a & Phase 7b) for the **Ewa Derma Clinic Management System**.

---

## 1. Backend Architecture

The backend Reports module (`backend/src/reports`) uses the **Delegated Handler Pattern**:

```
backend/src/reports/
├── reports.module.ts              # Bundles controller and all report services
├── reports.controller.ts          # Central HTTP router for /api/reports/*
├── appointments-report.service.ts # Appointments analytics (Phase 7a)
├── patients-report.service.ts     # Patients & Follow-ups analytics (Phase 7a)
├── revenue-report.service.ts      # Revenue & Financial analytics (Phase 7b)
├── inventory-report.service.ts    # Stock movement & Valuation analytics (Phase 7b)
└── report-exporter.service.ts     # Shared PDF/CSV/Excel document generator
```

### Available Endpoints:
- `GET /api/reports/appointments` — Appointment volume, completion rate, status distribution, doctor completion.
- `GET /api/reports/patients` — New registrations, returning patients, pending & overdue follow-up calls.
- `GET /api/reports/revenue` — Collected revenue (net of refunds), billed revenue, payment method split, doctor & service attribution.
- `GET /api/reports/inventory` — Total stock valuation, low stock items, expiring batches, top consumed medicines, stock movement ledger.
- `GET /api/reports/:type/export?format=pdf|csv|excel` — Shared export handlers streaming PDF, CSV, or Excel files.

---

## 2. Frontend Architecture (`/reports`)

The frontend `/reports` screen (`frontend/src/app/reports/page.tsx`) uses a **Unified Extensible Tab Registry**:
1. **Appointments Report**: Metric cards, status breakdown, doctor completion performance, itemized table.
2. **Patients & Follow-Ups**: Metric cards, follow-up call tracking list, new registrations table.
3. **Revenue & Payments**: Metric cards with gold accents (Collected Revenue vs Billed Revenue vs Outstanding Due), Payment Method pie breakdown, Doctor revenue attribution, Service revenue breakdown, and Invoices table.
4. **Inventory Movement**: Metric cards (Valuation, Low Stock count, Dispensed count), Top Consumed medicines, and Stock Movement Ledger table.

---

## 3. RBAC Rules Matrix

| Role | Appointments Report | Patients Report | Revenue Report | Inventory Report |
|---|:---:|:---:|:---:|:---:|
| **`ADMIN`** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **`RECEPTIONIST`** | ✅ Full | ✅ Full | ❌ Forbidden (403) | ❌ Forbidden (403) |
| **`DOCTOR`** | 🔒 Scoped (Self) | 🔒 Scoped (Self) | 🔒 Scoped (Self) | ❌ Forbidden (403) |
| **`INVENTORY_MANAGER`** | ❌ Forbidden (403) | ❌ Forbidden (403) | ❌ Forbidden (403) | ✅ Full |
