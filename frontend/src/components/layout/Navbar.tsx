'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '../ui/Logo';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LogOut, User, Bell } from 'lucide-react';

export const Navbar: React.FC = () => {
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-surface-border shadow-xs">
      <div className="flex items-center gap-4">
        <Logo size="sm" />
      </div>

      <div className="flex items-center gap-4">
        {/* User Info & Role */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end text-right">
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

            <div className="w-9 h-9 rounded-full bg-primary-50 text-primary-700 border border-primary-200 flex items-center justify-center font-bold text-sm">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              leftIcon={<LogOut className="w-4 h-4 text-text-secondary hover:text-status-danger" />}
              className="text-xs text-text-secondary hover:text-status-danger hover:bg-red-50"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
