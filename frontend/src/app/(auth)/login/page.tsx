'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  Shield,
  Stethoscope,
  Building2,
  Package,
  Sparkles,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

interface RoleOption {
  id: string;
  roleName: string;
  badgeLabel: string;
  email: string;
  description: string;
  icon: React.ReactNode;
  themeColor: string;
  bgLight: string;
  badgeVariant: 'primary' | 'accent' | 'success' | 'warning';
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'ADMIN',
    roleName: 'Clinic Administrator',
    badgeLabel: 'ADMIN',
    email: 'admin@ewaderma.com',
    description: 'Full clinic access, doctor rosters, RBAC & system analytics',
    icon: <Shield className="w-5 h-5 text-primary" />,
    themeColor: 'border-primary text-primary',
    bgLight: 'bg-primary-50/50',
    badgeVariant: 'primary',
  },
  {
    id: 'DOCTOR',
    roleName: 'Dermatologist / Doctor',
    badgeLabel: 'DOCTOR',
    email: 'doctor@ewaderma.com',
    description: 'Doctor Workspace, live patient queue, consultations & RX',
    icon: <Stethoscope className="w-5 h-5 text-accent" />,
    themeColor: 'border-accent text-accent',
    bgLight: 'bg-amber-50/50',
    badgeVariant: 'accent',
  },
  {
    id: 'RECEPTIONIST',
    roleName: 'Receptionist & Front Desk',
    badgeLabel: 'RECEPTIONIST',
    email: 'reception@ewaderma.com',
    description: 'Patient registration, appointment booking & queue check-in',
    icon: <Building2 className="w-5 h-5 text-emerald-600" />,
    themeColor: 'border-emerald-500 text-emerald-600',
    bgLight: 'bg-emerald-50/50',
    badgeVariant: 'success',
  },
  {
    id: 'INVENTORY_MANAGER',
    roleName: 'Pharmacy & Stock Manager',
    badgeLabel: 'INVENTORY',
    email: 'inventory@ewaderma.com',
    description: 'Stock management, medicine catalog & pharmacy inventory',
    icon: <Package className="w-5 h-5 text-purple-600" />,
    themeColor: 'border-purple-500 text-purple-600',
    bgLight: 'bg-purple-50/50',
    badgeVariant: 'warning',
  },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<string>('ADMIN');
  const [identifier, setIdentifier] = useState('admin@ewaderma.com');
  const [password, setPassword] = useState('Clinic@12345');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();

  // Role dropdown change handler
  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    const selected = ROLE_OPTIONS.find((r) => r.id === roleId);
    if (selected) {
      setIdentifier(selected.email);
      setPassword('Clinic@12345');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      showToast('Please enter both email and password', 'warning', 'Validation Error');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier, password);
      showToast('Login successful! Directing to your workspace...', 'success');
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Invalid login credentials';
      showToast(msg, 'error', 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoleObj = ROLE_OPTIONS.find((r) => r.id === selectedRole) || ROLE_OPTIONS[0];

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary to-primary-800 text-text-primary">
      {/* Decorative Ambient Background Elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary-400/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-64 h-64 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

      {/* 1. TOP BRANDING HEADER */}
      <div className="mb-6 flex flex-col items-center text-center z-10 space-y-2">
        <div className="p-3.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-accent/30 inline-flex items-center gap-3">
          <Logo size="lg" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-white/90 font-serif text-sm font-semibold tracking-wide">
            Ewa Derma Clinic Management System
          </span>
          <span className="bg-accent/20 border border-accent text-accent-light px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
            Lucknow Branch
          </span>
        </div>
      </div>

      {/* 2. MAIN INTERACTIVE LOGIN CARD */}
      <Card className="w-full max-w-lg shadow-2xl border border-white/20 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden z-10 relative">
        {/* Top Gold Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* STEP 1: INTERACTIVE "WHO ARE YOU?" ROLE DROPDOWN & SELECTOR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" />
                Who are you? (Select Role)
              </label>
              <Badge variant={currentRoleObj.badgeVariant} size="sm">
                {currentRoleObj.badgeLabel}
              </Badge>
            </div>

            {/* Role Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => handleRoleSelect(e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-primary-100 bg-surface px-4 pr-10 text-sm font-semibold text-text-primary focus:border-accent focus:bg-white focus:outline-none transition-all cursor-pointer shadow-xs appearance-none"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.roleName} ({opt.email})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-text-muted absolute right-3.5 top-4 pointer-events-none" />
            </div>

            {/* Active Selected Role Preview Badge */}
            <div className={`p-3 rounded-xl border ${currentRoleObj.bgLight} border-surface-border flex items-start gap-3 transition-all`}>
              <div className="p-2 rounded-lg bg-white shadow-xs shrink-0 mt-0.5">
                {currentRoleObj.icon}
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-text-primary">
                    {currentRoleObj.roleName}
                  </span>
                  <span className="text-[10px] text-accent font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Selected
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-snug">
                  {currentRoleObj.description}
                </p>
              </div>
            </div>
          </div>

          {/* STEP 2: LOGIN CREDENTIALS FORM */}
          <form onSubmit={handleLogin} className="space-y-4 pt-1">
            <Input
              label="Email / Username"
              type="text"
              placeholder="e.g. admin@ewaderma.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-text-muted" />}
              required
              className="bg-white"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-text-muted" />}
              required
              className="bg-white"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-12 text-sm font-bold shadow-md hover:shadow-lg transition-all"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to {currentRoleObj.badgeLabel} Workspace
            </Button>
          </form>

          {/* STEP 3: QUICK 1-CLICK DEMO LOGIN PRESETS */}
          <div className="pt-4 border-t border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-accent" />
                Quick 1-Click Demo Logins
              </span>
              <span className="text-[10px] text-text-muted font-mono">Password: Clinic@12345</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((role) => {
                const isActive = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSelect(role.id)}
                    className={`text-left p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive
                        ? 'border-accent bg-amber-50/60 shadow-xs ring-1 ring-accent/30'
                        : 'border-surface-border bg-surface hover:bg-white hover:border-primary-200'
                    }`}
                  >
                    <div className="shrink-0">{role.icon}</div>
                    <div className="truncate">
                      <div className="font-bold text-text-primary text-xs truncate">
                        {role.badgeLabel}
                      </div>
                      <div className="text-[10px] text-text-muted font-mono truncate">
                        {role.email}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FOOTER CLINIC INFO */}
      <div className="mt-6 text-center text-xs text-white/80 space-y-0.5 z-10">
        <p className="font-semibold text-accent-light">Ewa Derma Clinic • Lucknow, Uttar Pradesh</p>
        <p className="text-[11px] text-white/70">Phone: 0120-5244840 • Hours: 10:00 AM – 7:00 PM (7 Days)</p>
      </div>
    </div>
  );
}
