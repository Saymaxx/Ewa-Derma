'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheck,
  Building2,
  Phone,
  Clock,
  MapPin,
  Database,
  Lock,
  Key,
  Users,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [adminCheckResult, setAdminCheckResult] = useState<any>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  const triggerAdminCheck = async () => {
    setIsCheckingAdmin(true);
    try {
      const res = await api.get('/admin/health-check');
      setAdminCheckResult({ success: true, data: res.data.data });
      showToast('Admin access verified successfully (HTTP 200)', 'success', 'RBAC Authorized');
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      setAdminCheckResult({ success: false, status, message: msg });
      if (status === 403) {
        showToast(`RBAC Enforced: ${msg}`, 'warning', 'HTTP 403 Forbidden');
      } else {
        showToast(msg, 'error', `Error HTTP ${status}`);
      }
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary via-primary-600 to-primary-dark p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif tracking-tight">
              Welcome, {user?.firstName} {user?.lastName}
            </h1>
            <span className="bg-accent/20 border border-accent text-accent-light px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
              {user?.roles?.join(', ')}
            </span>
          </div>
          <p className="text-primary-100 text-sm max-w-xl">
            Ewa Derma Clinic Management System • Phase 1 Foundation Active
          </p>
        </div>

        <div className="z-10 flex gap-2">
          <Button
            variant="accent"
            size="sm"
            onClick={triggerAdminCheck}
            isLoading={isCheckingAdmin}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Test Admin RBAC Route
          </Button>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-accent/15 blur-2xl pointer-events-none" />
      </div>

      {/* RBAC Result Banner (if tested) */}
      {adminCheckResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            adminCheckResult.success
              ? 'bg-status-success-bg border-green-200 text-status-success'
              : 'bg-status-warning-bg border-amber-200 text-status-warning'
          }`}
        >
          {adminCheckResult.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="text-sm font-bold">
              {adminCheckResult.success
                ? 'Admin Privileges Confirmed (HTTP 200 OK)'
                : `Access Controlled (HTTP ${adminCheckResult.status || 403} Forbidden)`}
            </h4>
            <p className="text-xs mt-0.5 opacity-90">
              {adminCheckResult.success
                ? `Backend system health: ${adminCheckResult.data?.system} (${adminCheckResult.data?.stats?.totalUsers} registered users, ${adminCheckResult.data?.stats?.totalRoles} roles seeded)`
                : adminCheckResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Grid: Clinic Details & System Infrastructure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clinic Info Card */}
        <Card accentTop>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <CardTitle>Clinic Information</CardTitle>
            </div>
            <Badge variant="accent">Lucknow Branch</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="font-semibold text-text-primary block">
                Ewa Derma Clinic
              </span>
              <p className="text-xs text-text-secondary mt-1 flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                6th Floor, Unit No. 10, The Millennium Place, near Lulu Mall, Golf City, Sector B, Ansal API, Lucknow, Uttar Pradesh 226030
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-border">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>0120-5244840</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>10:00 AM – 7:00 PM (7 Days)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface text-xs text-text-secondary border border-surface-border flex items-center justify-between">
              <span>Appointment Slot Duration</span>
              <span className="font-bold text-primary">30 minutes (Configurable)</span>
            </div>
          </CardContent>
        </Card>

        {/* System Foundation Specs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              <CardTitle>Phase 1 Foundation Deliverables</CardTitle>
            </div>
            <Badge variant="success" dot>Operational</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-surface-border">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <span className="font-medium text-text-primary">Database Engine</span>
              </div>
              <Badge variant="primary" size="sm">PostgreSQL 16 (Dockerized)</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-surface-border">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <span className="font-medium text-text-primary">Password Hashing</span>
              </div>
              <Badge variant="primary" size="sm">Argon2 Security</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-surface-border">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <span className="font-medium text-text-primary">Auth Pattern</span>
              </div>
              <span className="text-text-secondary font-mono text-[11px]">JWT Access (15m) + Refresh (7d)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-surface-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-medium text-text-primary">RBAC Guard</span>
              </div>
              <span className="text-text-secondary font-medium">ADMIN, DOCTOR, RECEPTION, INVENTORY</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-surface-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span className="font-medium text-text-primary">Audit Logging</span>
              </div>
              <Badge variant="accent" size="sm">Active on sensitive endpoints</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entity ID Numbering Specs */}
      <Card>
        <CardHeader>
          <CardTitle>Fixed Entity Numbering Schemes (Backend Sequences)</CardTitle>
          <span className="text-xs text-text-muted">Simple, sequential, backend-generated</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-surface-border bg-surface text-center space-y-1">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Patients</span>
              <div className="text-lg font-bold text-primary font-mono">P-1001</div>
              <p className="text-[11px] text-text-muted">Starts at 1001</p>
            </div>

            <div className="p-4 rounded-xl border border-surface-border bg-surface text-center space-y-1">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Appointments</span>
              <div className="text-lg font-bold text-primary font-mono">A-2044</div>
              <p className="text-[11px] text-text-muted">Starts at 2001</p>
            </div>

            <div className="p-4 rounded-xl border border-surface-border bg-surface text-center space-y-1">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Prescriptions</span>
              <div className="text-lg font-bold text-primary font-mono">RX-3007</div>
              <p className="text-[11px] text-text-muted">Versioned</p>
            </div>

            <div className="p-4 rounded-xl border border-surface-border bg-surface text-center space-y-1">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Invoices</span>
              <div className="text-lg font-bold text-primary font-mono">INV-5021</div>
              <p className="text-[11px] text-text-muted">No hard deletes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
