# Reports Module Extension Strategy (Phase 7b Blueprint)

This document outlines the architectural extension pattern for adding **Revenue** and **Inventory** reports in Phase 7b (after Phase 4 Billing and Phase 5 Inventory modules are completed).

---

## 1. Backend Extension Strategy

The backend Reports module (`backend/src/reports`) is structured using the **Delegated Handler Pattern**:

```
backend/src/reports/
├── reports.module.ts              # Bundles controller and all report services
├── reports.controller.ts          # Central HTTP router for /api/reports/*
├── appointments-report.service.ts # Appointments analytics (Phase 7a)
├── patients-report.service.ts     # Patients & Follow-ups analytics (Phase 7a)
├── report-exporter.service.ts     # Shared PDF/CSV/Excel document generator
├── revenue-report.service.ts      # [TO BE ADDED IN PHASE 7b]
└── inventory-report.service.ts    # [TO BE ADDED IN PHASE 7b]
```

### Steps to add Phase 7b Reports on Backend:

1. **Create `RevenueReportService` (`backend/src/reports/revenue-report.service.ts`)**:
   - Compute total revenue, GST breakdown, payment method breakdown (Cash, Card, UPI), and outstanding invoices over date range.
2. **Create `InventoryReportService` (`backend/src/reports/inventory-report.service.ts`)**:
   - Compute current stock levels, low-stock items, expired/expiring batches, and stock movement trends.
3. **Register Services in `ReportsModule`**:
   - Add `RevenueReportService` and `InventoryReportService` to `providers` and `exports`.
4. **Expose Endpoints in `ReportsController`**:
   - Add `GET /api/reports/revenue` and `GET /api/reports/inventory`.
   - Add `GET /api/reports/revenue/export` and `GET /api/reports/inventory/export`.
5. **Update `ReportExporterService`**:
   - Add `buildRevenueCsv`, `buildInventoryCsv`, `generateRevenuePdf`, `generateInventoryPdf`.

---

## 2. Frontend Extension Strategy

The frontend `/reports` screen (`frontend/src/app/reports/page.tsx`) uses a **Data-Driven Tab Registry**:

```tsx
const REPORT_TABS = [
  { id: 'appointments', label: 'Appointments Report', icon: Calendar, enabled: true },
  { id: 'patients', label: 'Patients & Follow-Ups', icon: Users, enabled: true },
  { id: 'revenue', label: 'Revenue & Payments', icon: CreditCard, enabled: false /* Enable in Phase 7b */ },
  { id: 'inventory', label: 'Inventory Movement', icon: Package, enabled: false /* Enable in Phase 7b */ },
];
```

### Steps to add Phase 7b Reports on Frontend:

1. Change `enabled: false` to `enabled: true` for `revenue` and `inventory` tabs in `REPORT_TABS`.
2. Add API fetchers in `fetchReportData` for `revenue` and `inventory`.
3. Add render blocks for `<RevenueReportView />` and `<InventoryReportView />` components inside `/reports/page.tsx`.

---

## 3. RBAC Rules Matrix

| Role | Appointments Report | Patients Report | Revenue Report (7b) | Inventory Report (7b) |
|---|:---:|:---:|:---:|:---:|
| **`ADMIN`** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **`RECEPTIONIST`** | ✅ Full | ✅ Full | ❌ Forbidden | ❌ Forbidden |
| **`DOCTOR`** | 🔒 Scoped (Self) | 🔒 Scoped (Self) | ❌ Forbidden | ❌ Forbidden |
| **`INVENTORY_MANAGER`** | ❌ Forbidden (403) | ❌ Forbidden (403) | ❌ Forbidden | ✅ Full |
