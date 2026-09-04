'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  FileText,
  CreditCard,
  Package,
  PackagePlus,
  ShoppingCart,
  Sliders,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  Palette,
  Clock,
  UserCog,
  Bell,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: ('ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'INVENTORY_MANAGER')[];
}

export const Sidebar: React.FC = () => {
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

  return (
    <aside className="w-64 bg-white border-r border-surface-border flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
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
      <div className="p-4 border-t border-surface-border bg-surface/50">
        <div className="text-xs text-text-muted space-y-1">
          <p className="font-medium text-text-primary">Ewa Derma Clinic</p>
          <p className="text-[11px]">Clinic Management System</p>
          <p className="text-[10px] text-accent font-semibold">v1.0.0 Production Ready</p>
        </div>
      </div>
    </aside>
  );
};
