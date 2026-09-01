'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Loader2 } from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !pathname.includes('/login') && !pathname.includes('/design-system')) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium text-text-secondary">Loading Ewa Derma Clinic...</p>
      </div>
    );
  }

  // If on login page, render without navbar/sidebar
  if (pathname.includes('/login')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
