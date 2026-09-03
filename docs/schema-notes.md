# Schema & Pricing Notes — Ewa Derma Clinic Management System

## Phase 4: Placeholder Service Catalog & Pricing Policy

The database initializes with 6 placeholder procedure services upon module initialization (`ServicesService` bootstrap seed):

| Service Name | Category | Base Price (INR) | Mandatory Audit Note on Discount |
| :--- | :--- | :--- | :--- |
| **Consultation** | General Dermatology | ₹500 | Yes (`discountReason` if discount > 0) |
| **Chemical Peel** | Aesthetic Dermatology | ₹2,500 | Yes (`discountReason` if discount > 0) |
| **Laser Hair Reduction** | Aesthetic Laser | ₹3,000 | Yes (`discountReason` if discount > 0) |
| **PRP Therapy** | Hair & Skin Rejuvenation | ₹5,000 | Yes (`discountReason` if discount > 0) |
| **Facial** | Glow & Cleanse | ₹1,500 | Yes (`discountReason` if discount > 0) |
| **Hair Treatment** | Hair Restoration | ₹2,000 | Yes (`discountReason` if discount > 0) |

> **Note on Service Rates:** Admin users can modify service base prices or introduce new procedure services at runtime via `POST /api/services` and `PATCH /api/services/:id`.

---

## Data Schema & Accounting Integrity Standards

1. **Entity Sequence Generators:**
   - Invoices use `EntityIdService` prefix `INV-5000` (`INV-5001`, `INV-5002`, ...).
   - Sequential, versioned, non-gap billing identifiers.

2. **Partial Payments Engine:**
   - Invoices support multi-tranche partial payments (e.g. ₹1,000 via UPI + ₹1,500 via Cash).
   - The server dynamically calculates running total paid and automatically updates invoice status:
     - `PENDING` → `PARTIALLY_PAID` (when `0 < paidAmount < totalAmount`)
     - `PARTIALLY_PAID` → `PAID` (when `paidAmount >= totalAmount`)

3. **Strict Audit Trail for Refunds:**
   - Original payment records are **immutable** and never modified or deleted.
   - Refunds are issued as separate linked `Refund` records referencing `paymentId`.
   - Refund processing is strictly restricted to `ADMIN` role.

4. **Tax Policy:**
   - Invoices default to 0% GST (clinic not GST registered), while fully supporting working `taxRate` and `taxAmount` fields.

5. **Discount Policy:**
   - Whenever `discountAmount > 0`, backend validation strictly enforces a non-empty `discountReason` for audit compliance.

---

## Phase 5: Stock Ledger & FEFO Dispensing Standards

1. **Stock Ledger Single Source of Truth (`inventory_transactions`):**
   - Current stock is **never** stored as a manually-editable static integer on `Medicine` or `MedicineBatch`.
   - Current stock is **always dynamically computed** by summing `inventory_transactions` (`SUM(quantity)`).
   - Stock IN operations (`PURCHASE_IN`, `ADJUSTMENT_IN`, `RETURN_IN`) insert positive `quantity`.
   - Stock OUT operations (`DISPENSED_OUT`, `EXPIRED_OUT`, `DAMAGED_OUT`, `ADJUSTMENT_OUT`) insert negative `quantity`.

2. **Prescription vs. Dispensing Decoupling:**
   - Prescription creation (Phase 3) **NEVER** deducts stock. Doctors prescribe medications without altering physical inventory ledgers.
   - Physical stock is deducted **ONLY** when a prescription is explicitly dispensed (`POST /api/prescriptions/:id/dispense`).

3. **FEFO (First-Expiry-First-Out) Engine:**
   - Stock deduction automatically selects active, unexpired batches (`expiryDate > NOW()`) sorted in ascending order of `expiryDate`.
   - Dispensing attempts exceeding total unexpired stock are rejected with `400 Bad Request` (no negative stock allowed).

4. **Mandatory Audit Reasons for Manual Adjustments:**
   - Manual stock write-offs (`DAMAGED_OUT`, `EXPIRED_OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`) require a non-empty `reason` string.
   - Adjustments are restricted to `ADMIN` and `INVENTORY_MANAGER` roles. Past transactions are immutable; corrections occur via offsetting adjustment entries.

