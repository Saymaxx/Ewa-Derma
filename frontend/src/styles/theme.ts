/**
 * Ewa Derma Clinic Management System - Design Tokens & Theme Constants
 * Color Palette: Blue (Primary), Gold (Accent), Clean Surface/White
 */

export const THEME_COLORS = {
  // Primary Clinical Blue
  primary: {
    DEFAULT: '#1E4E8C',
    light: '#5B87BE',
    dark: '#133561',
    surface: '#F0F5FA',
    border: '#DCE7F3',
  },
  // Luxury Clinical Gold (Used for accents, badges, highlights - NOT base surfaces)
  accent: {
    DEFAULT: '#C9A24B',
    light: '#DEC17A',
    dark: '#A68233',
    surface: '#FCF9F1',
    border: '#F7F0DC',
  },
  // Neutral Surfaces
  background: '#FFFFFF',
  surface: {
    DEFAULT: '#F7F8FA',
    card: '#FFFFFF',
    border: '#E5E7EB',
    subtle: '#EEF0F4',
  },
  // Typography
  text: {
    primary: '#1A1A1A',
    secondary: '#6B7280',
    muted: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  // Unified System Status Colors
  status: {
    success: {
      text: '#15803D',
      bg: '#DCFCE7',
      border: '#86EFAC',
    },
    warning: {
      text: '#B45309',
      bg: '#FEF3C7',
      border: '#FCD34D',
    },
    danger: {
      text: '#B91C1C',
      bg: '#FEE2E2',
      border: '#FCA5A5',
    },
    info: {
      text: '#1D4ED8',
      bg: '#DBEAFE',
      border: '#93C5FD',
    },
  },
} as const;

// Unified Status Mapping across entire application
export const STATUS_MAPPINGS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  // Appointments
  SCHEDULED: { label: 'Scheduled', variant: 'info' },
  CONFIRMED: { label: 'Confirmed', variant: 'info' },
  CHECKED_IN: { label: 'Checked In', variant: 'warning' },
  WAITING: { label: 'Waiting', variant: 'warning' },
  IN_CONSULTATION: { label: 'In Consultation', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  NO_SHOW: { label: 'No Show', variant: 'danger' },

  // Invoices
  DRAFT: { label: 'Draft', variant: 'default' },
  PENDING: { label: 'Pending Payment', variant: 'warning' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'success' },
  REFUNDED: { label: 'Refunded', variant: 'danger' },

  // Stock / Batches
  IN_STOCK: { label: 'In Stock', variant: 'success' },
  LOW_STOCK: { label: 'Low Stock', variant: 'warning' },
  EXPIRED: { label: 'Expired', variant: 'danger' },
  EXPIRING_SOON: { label: 'Expiring Soon', variant: 'warning' },
};
