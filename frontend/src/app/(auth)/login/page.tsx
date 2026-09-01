'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Lock, Mail, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      showToast('Please enter both identifier and password', 'warning', 'Validation Error');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier, password);
      showToast('Welcome to Ewa Derma Clinic Management System', 'success', 'Login Successful');
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Invalid username or password';
      showToast(msg, 'error', 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = (email: string) => {
    setIdentifier(email);
    setPassword('Clinic@12345');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-surface via-white to-primary-50/30">
      {/* Top Clinic Branding */}
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size="lg" />
        <p className="mt-2 text-sm text-text-secondary max-w-sm">
          Clinical Operations, Prescriptions, Billing & Stock Management
        </p>
      </div>

      {/* Main Login Card */}
      <Card accentTop className="w-full max-w-md shadow-xl border-t-accent">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-text-primary">Sign in to your account</h2>
            <p className="text-xs text-text-secondary">
              Enter your credentials or use quick-role presets below
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email or Username"
              type="text"
              placeholder="e.g. admin@ewaderma.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-text-muted" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-text-muted" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick Demo Credentials Bar */}
          <div className="pt-4 border-t border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-accent" />
                Quick Test Roles (Demo)
              </span>
              <span className="text-[10px] text-text-muted">Password: Clinic@12345</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickLogin('admin@ewaderma.com')}
                className="text-left p-2 rounded-lg border border-surface-border bg-surface hover:bg-primary-50/50 hover:border-primary-200 transition-all text-xs"
              >
                <div className="font-semibold text-text-primary">Administrator</div>
                <div className="text-[11px] text-text-muted">admin@ewaderma.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('doctor@ewaderma.com')}
                className="text-left p-2 rounded-lg border border-surface-border bg-surface hover:bg-primary-50/50 hover:border-primary-200 transition-all text-xs"
              >
                <div className="font-semibold text-text-primary">Dr. A Sharma</div>
                <div className="text-[11px] text-text-muted">doctor@ewaderma.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('reception@ewaderma.com')}
                className="text-left p-2 rounded-lg border border-surface-border bg-surface hover:bg-primary-50/50 hover:border-primary-200 transition-all text-xs"
              >
                <div className="font-semibold text-text-primary">Receptionist</div>
                <div className="text-[11px] text-text-muted">reception@ewaderma.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('inventory@ewaderma.com')}
                className="text-left p-2 rounded-lg border border-surface-border bg-surface hover:bg-primary-50/50 hover:border-primary-200 transition-all text-xs"
              >
                <div className="font-semibold text-text-primary">Inventory Mgr</div>
                <div className="text-[11px] text-text-muted">inventory@ewaderma.com</div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="mt-8 text-center text-xs text-text-muted space-y-1">
        <p>Ewa Derma Clinic • Lucknow, Uttar Pradesh</p>
        <p className="text-[11px]">Phone: 0120-5244840 • Hours: 10:00 AM – 7:00 PM (Mon–Sun)</p>
      </div>
    </div>
  );
}
