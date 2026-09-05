'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '../ui/Logo';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  CreditCard,
  Package,
  PackagePlus,
  ShoppingCart,
  Sliders,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  Clock,
  UserCog,
  Bell,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: ('ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'INVENTORY_MANAGER')[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    // Receptionist / Shared Patient & Appointment items
    {
      label: 'Patients',
      href: '/patients',
      icon: <Users className="w-5 h-5" />,
      roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'],
    },
    {
      label: 'Appointments & Booking',
      href: '/appointments',
      icon: <Calendar className="w-5 h-5" />,
      roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'],
    },
    // Doctor specific items
    {
      label: 'Doctor Workspace',
      href: '/doctor/dashboard',
      icon: <Stethoscope className="w-5 h-5" />,
      roles: ['ADMIN', 'DOCTOR'],
    },
    {
      label: 'Doctor Roster',
      href: '/doctors',
      icon: <UserCog className="w-5 h-5" />,
      roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'],
    },
    {
      label: 'Billing & Invoices',
      href: '/invoices',
      icon: <CreditCard className="w-5 h-5" />,
      roles: ['ADMIN', 'RECEPTIONIST'],
    },
    // Inventory items
    {
      label: 'Pharmacy Formulary',
      href: '/medicines',
      icon: <Package className="w-5 h-5" />,
      roles: ['ADMIN', 'INVENTORY_MANAGER'],
    },
    {
      label: 'Add New Medicine',
      href: '/medicines/new',
      icon: <PackagePlus className="w-5 h-5" />,
      roles: ['ADMIN', 'INVENTORY_MANAGER'],
    },
    {
      label: 'Stock Purchases (In)',
      href: '/inventory/purchases',
      icon: <ShoppingCart className="w-5 h-5" />,
      roles: ['ADMIN', 'INVENTORY_MANAGER'],
    },
    {
      label: 'Stock Adjustments',
      href: '/inventory/adjustments',
      icon: <Sliders className="w-5 h-5" />,
      roles: ['ADMIN', 'INVENTORY_MANAGER'],
    },
    {
      label: 'Expiry Tracking',
      href: '/inventory/expiry',
      icon: <Clock className="w-5 h-5" />,
      roles: ['ADMIN', 'INVENTORY_MANAGER'],
    },
    // Reports
    {
      label: 'Reports & Analytics',
      href: '/reports',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'INVENTORY_MANAGER'],
    },
    {
      label: 'Notification Log',
      href: '/notifications',
      icon: <Bell className="w-5 h-5" />,
      roles: ['ADMIN'],
    },
    {
      label: 'Clinic Settings',
      href: '#',
      icon: <Settings className="w-5 h-5" />,
      roles: ['ADMIN'],
    },
    {
      label: 'Audit Logs',
      href: '#',
      icon: <ShieldCheck className="w-5 h-5" />,
      roles: ['ADMIN'],
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user || !user.roles) return false;
    return item.roles.some((r) => user.roles.includes(r));
  });

  const renderNavContent = () => (
    <>
      <div className="p-4 space-y-1 overflow-y-auto flex-1 overscroll-contain">
        <div className="px-3 py-2 text-xs font-bold text-text-muted uppercase tracking-wider">
          Navigation Menu
        </div>
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && item.href !== '#');
            const isClickable = item.href !== '#';

            if (!isClickable) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium text-text-muted cursor-not-allowed opacity-60"
                  title="Coming in later phases"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => onClose?.()}
                className={clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group',
                  isActive
                    ? 'bg-primary-50 text-primary font-semibold'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary',
                )}
              >
                {/* Gold Accent Bar on Active State */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent" />
                )}
                <span
                  className={clsx(
                    'transition-colors',
                    isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary',
                  )}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info in Sidebar */}
      <div className="p-4 border-t border-surface-border bg-surface/50 shrink-0">
        <div className="text-xs text-text-muted space-y-1">
          <p className="font-medium text-text-primary">Ewa Derma Clinic</p>
          <p className="text-[11px]">Clinic Management System</p>
          <p className="text-[10px] text-accent font-semibold">v1.0.0 Production Ready</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Sidebar: Permanently docked at lg and above */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-surface-border flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
        {renderNavContent()}
      </aside>

      {/* 2. Mobile/Tablet Off-Canvas Drawer (Below lg breakpoint) */}
      <div
        className={clsx(
          'fixed inset-0 z-50 lg:hidden transition-all duration-300',
          isOpen ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none',
        )}
      >
        {/* Dimmed Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <aside
          className={clsx(
            'relative z-50 w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {/* Mobile Drawer Top Header with Logo & Close Button */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-surface-border bg-white shrink-0">
            <Logo size="sm" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {renderNavContent()}
        </aside>
      </div>
    </>
  );
};

