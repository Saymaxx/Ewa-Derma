# Ewa Derma Clinic Management System — Design System Documentation

## 1. Brand Identity & Principles

- **Clinic Name:** Ewa Derma Clinic
- **Location:** Lucknow, Uttar Pradesh
- **Core Philosophy:** **Clarity over density.** Fast, distraction-free clinical navigation with refined aesthetic polish. A doctor or receptionist should never wonder where an action is located.

---

## 2. Color Palette & Tokens

| Token Name | Hex Value | Usage Rules |
|---|---|---|
| `--color-primary` (Blue) | `#1E4E8C` | Primary buttons, active navigation backgrounds, table headers, clinical links |
| `--color-primary-light` | `#5B87BE` | Hover states, secondary accents, borders on focused elements |
| `--color-primary-dark` | `#133561` | Active button presses, deep gradients, top headers |
| `--color-accent` (Gold) | `#C9A24B` | **Accent highlights ONLY.** Badges, active nav indicator bars, revenue metrics, brand pins. Never use as a broad background surface. |
| `--color-background` | `#FFFFFF` | Core page card backgrounds, modals, dropdown menus |
| `--color-surface` | `#F7F8FA` | Application body background, table alternating stripes, sidebars |
| `--color-text-primary` | `#1A1A1A` | High-contrast headings and body text |
| `--color-text-secondary` | `#6B7280` | Subtitles, labels, metadata |
| `--color-text-muted` | `#9CA3AF` | Placeholder text, disabled labels |
| `--color-success` | `#2E9E5B` / `#15803D` | Paid invoices, completed appointments, active status badges |
| `--color-warning` | `#D97706` / `#B45309` | Low stock, pending payments, waiting room queue |
| `--color-danger` | `#DC2626` / `#B91C1C` | Cancelled appointments, expired stock, error states |

---

## 3. Unified Status Mappings

All status fields across the app share a single, predictable visual vocabulary:

| Status Key | Module | Badge Color | Meaning |
|---|---|---|---|
| `SCHEDULED` | Appointments | Info (Blue) | Appointment booked for future slot |
| `CHECKED_IN` / `WAITING` | Appointments | Warning (Amber) | Patient has arrived at reception |
| `IN_CONSULTATION` | Appointments | Info (Blue) | Patient currently with doctor |
| `COMPLETED` | Appointments | Success (Green) | Consultation finished |
| `CANCELLED` / `NO_SHOW` | Appointments | Danger (Red) | Missed or cancelled |
| `DRAFT` | Invoices | Default (Gray) | Unfinalized bill |
| `PENDING` / `PARTIALLY_PAID` | Invoices | Warning (Amber) | Payment outstanding |
| `PAID` | Invoices | Success (Green) | Fully settled |
| `REFUNDED` | Invoices | Danger (Red) | Payment returned to patient |
| `IN_STOCK` | Inventory | Success (Green) | Healthy stock quantity |
| `LOW_STOCK` / `EXPIRING_SOON`| Inventory | Warning (Amber) | At or below minimum threshold |
| `EXPIRED` | Inventory | Danger (Red) | Passed expiry date |

---

## 4. Shared Component Library

All components reside in `frontend/src/components/ui/` and must be reused in all future phases:

1. **`Button`**: Supports `primary`, `secondary`, `accent`, `outline`, `ghost`, `danger`, loading spinner state, and icon prefixes.
2. **`Input`**: Standardized text, email, number, search inputs with error message rendering, label support, and icon adornments.
3. **`Card`**: Clean surface container with optional gold accent top border (`accentTop`), `CardHeader`, `CardTitle`, and `CardContent`.
4. **`Badge`**: Small pill-shaped status indicator with dot option (`variant="success" dot`).
5. **`Table`**: Responsive, stripped, hover-highlighted table for appointments, patients, stock batches, and invoices.
6. **`Modal`**: Backdrop-blurred modal dialog with smooth animation, escape key listener, and standard action footers.
7. **`Toast`**: Context-driven notification manager supporting `success`, `warning`, `error`, `info`.
8. **`Tabs`**: Clean tabbed switcher with counter badges.
9. **`Logo`**: Monogram badge with gold pin and clinical typography.

---

## 5. Preview & Sanity Check

The design system can be interactively reviewed at any time by navigating to `/design-system` in the frontend web application.
