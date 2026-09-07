# CI/CD Pipeline & Automated Testing Documentation

This document describes the automated Continuous Integration and Continuous Deployment (CI/CD) pipeline for **Ewa Derma Clinic Management System**.

---

## 1. Pipeline Overview

The pipeline is defined in [`.github/workflows/ci.yml`](file:///c:/Projects/Ewa%20Derma%20Clinic/.github/workflows/ci.yml) and runs on:
1. Every **Push** to `main` and `develop` branches.
2. Every **Pull Request** targeting `main` and `develop`.

---

## 2. Execution Stages & Order

```
[ Push / Pull Request ]
          │
          ├──► Job 1: backend-ci (PostgreSQL 15 Container)
          │      ├── 1. npm ci
          │      ├── 2. Prisma schema push & DB seeding
          │      ├── 3. Backend Unit Tests (13 test suites)
          │      └── 4. Backend Supertest E2E Suite (17 end-to-end flow checks)
          │
          ├──► Job 2: frontend-ci
          │      ├── 1. npm install
          │      ├── 2. Next.js Linting
          │      └── 3. Playwright E2E Tests (Chromium & Mobile Safari viewports)
          │
          ▼
   [ Both Jobs Pass ]
          │
          ▼
   Job 3: deploy (Gated on main branch push)
          ├── Deploys Backend (Railway / Render)
          └── Deploys Frontend (Vercel)
```

---

## 3. Test Suites Details

### Backend Unit Tests (`npm test`)
- Executes 13 unit test files (`*.spec.ts`) validating individual controllers, services, guards, and validators in isolation with mock Prisma clients.

### Backend Integration & E2E Suite (`npm run test:e2e`)
- Runs against a live PostgreSQL 15 service container.
- Verifies:
  1. **Authentication & Token Lifecycle**: Single response envelope formatting, login, protected routes, refresh token rotation, token revocation on logout.
  2. **Clinical to Billing Full Lifecycle**: Patient registration → Appointment booking → Status transitions (`SCHEDULED` → `CHECKED_IN` → `IN_CONSULTATION`) → Clinical consultation completion → Prescription generation → Invoice creation → Payment collection and automated invoice status update to `PAID`.
  3. **Role-Based Access Control (RBAC)**: Matrix tests for all 4 roles (`ADMIN`, `DOCTOR`, `RECEPTIONIST`, `INVENTORY_MANAGER`), verifying 403 Forbidden on restricted routes and 200 OK flat response envelope on permitted routes.
  4. **Inventory Stock Consistency**: Verifies that prescribing medication does not mutate stock, while dispensing items properly creates inventory transactions and reduces batch stock.

### Frontend E2E Suite (`npm run test:e2e`)
- Playwright browser test suite covering:
  1. Login & Admin navigation (`/dashboard`, `/settings`, `/audit-logs`).
  2. Patient registration & Appointment booking with live queue polling.
  3. Invoice list display regression check (protects against double response wrapping).
  4. Mobile responsive layout and off-canvas navigation drawer (at 375px viewport).

---

## 4. Troubleshooting a Red X (CI Failure)

If a PR or commit displays a Red ❌ on GitHub Actions:

1. **Backend Unit Test Failure**:
   - Check if an isolated service or helper logic was broken.
   - Run locally: `cd backend && npm test`.

2. **Backend Integration / E2E Failure**:
   - Check for API response format regressions, missing DTO validations, or broken state machine transitions.
   - Run locally: `cd backend && npm run test:e2e`.

3. **Frontend Lint / Test Failure**:
   - Check for TypeScript compile errors, missing Tailwind classes, or broken routes.
   - Run locally: `cd frontend && npm run lint`.

4. **Merge Protection**:
   - Merges to `main` should be blocked until all jobs complete with green status ✅.
