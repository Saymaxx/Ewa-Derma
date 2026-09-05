'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '../ui/Logo';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LogOut, Menu, X } from 'lucide-react';

interface NavbarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isSidebarOpen = false, onToggleSidebar }) => {
  const { user, logout } = useAuth();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'accent';
      case 'DOCTOR':
        return 'primary';
      case 'RECEPTIONIST':
        return 'info';
      case 'INVENTORY_MANAGER':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-surface-border shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button - only visible below lg */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {isSidebarOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <Logo size="sm" />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* User Info & Role */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-sm font-semibold text-text-primary leading-tight">
                {user.firstName} {user.lastName}
              </span>
              <div className="flex gap-1 mt-0.5">
                {user.roles.map((role) => (
                  <Badge
                    key={role}
                    size="sm"
                    variant={getRoleBadgeVariant(role) as any}
                  >
                    {role.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary-50 text-primary-700 border border-primary-200 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0"
              title={`${user.firstName} ${user.lastName} (${user.roles.join(', ')})`}
            >
              {user.firstName[0]}
              {user.lastName[0]}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              leftIcon={<LogOut className="w-4 h-4 text-text-secondary hover:text-status-danger" />}
              className="text-xs text-text-secondary hover:text-status-danger hover:bg-red-50 px-2 sm:px-3"
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

