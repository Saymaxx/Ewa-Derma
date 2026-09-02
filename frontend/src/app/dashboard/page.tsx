'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Building2,
  Phone,
  Clock,
  MapPin,
  Users,
  Calendar,
  UserCheck,
  Stethoscope,
  Plus,
  ArrowRight,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  Check,
  Package,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    checkedInCount: 0,
    totalPatients: 0,
    activeDoctors: 0,
  });
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Admin Health Check state
  const [adminCheckResult, setAdminCheckResult] = useState<any>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [ptsRes, todayAptsRes, allAptsRes, docsRes] = await Promise.all([
        api.get('/patients', { params: { limit: 1 } }),
        api.get('/appointments', { params: { date: today } }),
        api.get('/appointments'),
        api.get('/doctors', { params: { onlyActive: true } }),
      ]);

      const todayList = todayAptsRes.data.data || [];
      const checkedIn = todayList.filter(
        (a: any) =>
          a.status === 'CHECKED_IN' ||
          a.status === 'WAITING' ||
          a.status === 'IN_CONSULTATION',
      ).length;

      setStats({
        totalPatients: ptsRes.data.data?.total || 0,
        todayAppointments: todayList.length,
        checkedInCount: checkedIn,
        activeDoctors: (docsRes.data.data || []).length,
      });

      setAllAppointments(allAptsRes.data.data || []);
    } catch {
      // Fallback silently if stats fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const triggerAdminCheck = async () => {
    setIsCheckingAdmin(true);
    try {
      const res = await api.get('/admin/health-check');
      setAdminCheckResult({ success: true, data: res.data.data });
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      setAdminCheckResult({ success: false, status, message: msg });
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  const isReceptionOrAdmin = hasRole(['ADMIN', 'RECEPTIONIST']);
  const isDoctor = hasRole(['DOCTOR']);
  const isAdmin = hasRole(['ADMIN']);
  const isInventoryManager = hasRole(['INVENTORY_MANAGER']) && !hasRole(['ADMIN', 'RECEPTIONIST']);

  // If user is Pharmacy Manager (and not Admin/Receptionist), render clean Pharmacy workspace
  if (isInventoryManager) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-serif tracking-tight">
                Welcome, {user?.firstName} {user?.lastName}
              </h1>
              <span className="bg-amber-400/20 border border-amber-400 text-amber-300 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                Pharmacy Manager
              </span>
            </div>
            <p className="text-purple-200 text-sm max-w-xl">
              Ewa Derma Clinic Management System • Lucknow Branch
            </p>
          </div>
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
        </div>

        <Card className="border-purple-200 shadow-sm">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mx-auto">
              <Package className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-text-primary">
                Pharmacy & Inventory Management
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                You are logged in with the <strong>Pharmacy Manager</strong> role. Medicine stock catalog, batch expiry tracking, and inventory restocking controls will be enabled during the Phase 5 Inventory release.
              </p>
            </div>
            <div className="pt-2">
              <Badge variant="warning" size="md">
                Phase 5 Module Standing By
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CHART 1 DATA: APPOINTMENT STATUS DISTRIBUTION
  // -------------------------------------------------------------
  const totalAptsCount = allAppointments.length || 1;
  const statusCounts = {
    SCHEDULED: allAppointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
    CHECKED_IN: allAppointments.filter((a) => a.status === 'CHECKED_IN' || a.status === 'WAITING').length,
    IN_CONSULTATION: allAppointments.filter((a) => a.status === 'IN_CONSULTATION').length,
    COMPLETED: allAppointments.filter((a) => a.status === 'COMPLETED').length,
    CANCELLED: allAppointments.filter((a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW').length,
  };

  const statusConfig = [
    { label: 'Completed', count: statusCounts.COMPLETED, color: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-50' },
    { label: 'In Consultation', count: statusCounts.IN_CONSULTATION, color: 'bg-primary', text: 'text-primary', bgLight: 'bg-primary-50' },
    { label: 'Checked-In / Waiting', count: statusCounts.CHECKED_IN, color: 'bg-amber-500', text: 'text-amber-700', bgLight: 'bg-amber-50' },
    { label: 'Scheduled / Confirmed', count: statusCounts.SCHEDULED, color: 'bg-sky-500', text: 'text-sky-700', bgLight: 'bg-sky-50' },
    { label: 'Cancelled', count: statusCounts.CANCELLED, color: 'bg-rose-500', text: 'text-rose-700', bgLight: 'bg-rose-50' },
  ];

  // -------------------------------------------------------------
  // CHART 2 DATA: PAST 7 DAYS PATIENT & CONSULTATION VOLUME
  // -------------------------------------------------------------
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const isoDate = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const count = allAppointments.filter((a) => {
      const aptDate = new Date(a.appointmentDate).toISOString().split('T')[0];
      return aptDate === isoDate;
    }).length;
    const completed = allAppointments.filter((a) => {
      const aptDate = new Date(a.appointmentDate).toISOString().split('T')[0];
      return aptDate === isoDate && a.status === 'COMPLETED';
    }).length;
    return { dayName, isoDate, count, completed };
  });

  const maxVolume = Math.max(...past7Days.map((d) => d.count), 5);

  return (
    <div className="space-y-6">
      {/* 1. TOP WELCOME & OPERATIONAL ACTION BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary via-primary-600 to-primary-dark p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
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
            Ewa Derma Clinic Management System • Lucknow Branch
          </p>
        </div>

        <div className="z-10 flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={triggerAdminCheck}
              isLoading={isCheckingAdmin}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Test Admin RBAC
            </Button>
          )}

          {isReceptionOrAdmin && (
            <>
              <Link href="/patients">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                  leftIcon={<Users className="w-4 h-4" />}
                >
                  Register Patient
                </Button>
              </Link>
              <Link href="/appointments">
                <Button
                  variant="accent"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Book Appointment
                </Button>
              </Link>
            </>
          )}

          {isDoctor && (
            <Link href="/doctor/dashboard">
              <Button
                variant="accent"
                size="sm"
                leftIcon={<Stethoscope className="w-4 h-4" />}
              >
                Go to Doctor Workspace
              </Button>
            </Link>
          )}
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-accent/15 blur-2xl pointer-events-none" />
      </div>

      {/* Admin Health Check Banner (if tested) */}
      {adminCheckResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            adminCheckResult.success
              ? 'bg-status-success-bg border-green-200 text-status-success'
              : 'bg-status-warning-bg border-amber-200 text-status-warning'
          }`}
        >
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm">
              {adminCheckResult.success
                ? 'Admin Access Verified (HTTP 200 OK)'
                : `Access Forbidden (HTTP ${adminCheckResult.status})`}
            </h4>
            <p className="mt-0.5 opacity-90">
              {adminCheckResult.success
                ? `System: ${adminCheckResult.data?.system} (${adminCheckResult.data?.stats?.totalUsers} Users, ${adminCheckResult.data?.stats?.totalRoles} Roles)`
                : adminCheckResult.message}
            </p>
          </div>
        </div>
      )}

      {/* 2. OPERATIONAL SUMMARY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary border border-primary-100 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                Today Scheduled
              </span>
              <span className="text-2xl font-bold text-text-primary">
                {isLoading ? '...' : stats.todayAppointments}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-accent border border-amber-200 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                In Clinic / Queue
              </span>
              <span className="text-2xl font-bold text-accent">
                {isLoading ? '...' : stats.checkedInCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                Total Patients
              </span>
              <span className="text-2xl font-bold text-text-primary">
                {isLoading ? '...' : stats.totalPatients}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-status-success border border-green-200 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                Active Doctors
              </span>
              <span className="text-2xl font-bold text-text-primary">
                {isLoading ? '...' : stats.activeDoctors}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. TWO ANALYTICS CHARTS (ADMIN ONLY VISUALIZATIONS) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CHART 1: APPOINTMENT STATUS DISTRIBUTION */}
          <Card accentTop>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-accent" />
                <CardTitle>Appointment Status Distribution</CardTitle>
              </div>
              <span className="text-xs text-text-muted">Total Records: {allAppointments.length}</span>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Visual Stacked Bar Chart */}
              <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                {statusConfig.map((item) => {
                  const pct = Math.round((item.count / totalAptsCount) * 100);
                  if (pct === 0) return null;
                  return (
                    <div
                      key={item.label}
                      style={{ width: `${pct}%` }}
                      className={`${item.color} h-full transition-all duration-500`}
                      title={`${item.label}: ${item.count} (${pct}%)`}
                    />
                  );
                })}
              </div>

              {/* Status Breakdown Legend Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {statusConfig.map((item) => {
                  const pct = Math.round((item.count / totalAptsCount) * 100);
                  return (
                    <div
                      key={item.label}
                      className={`p-3 rounded-xl border border-surface-border ${item.bgLight} flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
                        <span className="text-xs font-semibold text-text-primary">
                          {item.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold text-xs font-mono block ${item.text}`}>
                          {item.count}
                        </span>
                        <span className="text-[10px] text-text-muted">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* CHART 2: WEEKLY PATIENT & CONSULTATION VOLUME */}
          <Card accentTop>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <CardTitle>Weekly Patient & Consultation Volume</CardTitle>
              </div>
              <span className="text-xs text-text-muted">Past 7 Days Trend</span>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* SVG Bar Chart */}
              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-surface-border px-2">
                {past7Days.map((d) => {
                  const barHeight = Math.max(12, Math.round((d.count / maxVolume) * 140));
                  const completedHeight = Math.max(0, Math.round((d.completed / maxVolume) * 140));

                  return (
                    <div key={d.isoDate} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-text-primary text-white text-[10px] py-1 px-2 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                        {d.count} Total ({d.completed} Completed)
                      </div>

                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        {/* Total Appointments Bar */}
                        <div
                          style={{ height: `${barHeight}px` }}
                          className="w-full max-w-[28px] bg-primary/80 group-hover:bg-primary rounded-t-md transition-all duration-300 relative flex items-start justify-center pt-1"
                        >
                          {d.count > 0 && (
                            <span className="text-[10px] font-bold text-white font-mono">
                              {d.count}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-text-secondary group-hover:text-primary transition-colors">
                        {d.dayName}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-text-secondary px-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-primary" />
                  <span>Daily Scheduled Visits</span>
                </div>
                <span className="text-[11px] text-text-muted">Max Volume: {maxVolume} Visits</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. WORKFLOW SHORTCUT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/patients" className="block group">
          <Card className="h-full group-hover:border-primary group-hover:shadow-md transition-all">
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    Patient Directory
                  </h3>
                </div>
                <p className="text-xs text-text-secondary">
                  Search patients by name, phone, or P-1001 code. Register new patients.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/appointments" className="block group">
          <Card className="h-full group-hover:border-primary group-hover:shadow-md transition-all">
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    Appointments & Booking
                  </h3>
                </div>
                <p className="text-xs text-text-secondary">
                  View appointment schedule, check-in arriving patients, book walk-ins.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/doctors" className="block group">
          <Card className="h-full group-hover:border-primary group-hover:shadow-md transition-all">
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    Doctor Roster
                  </h3>
                </div>
                <p className="text-xs text-text-secondary">
                  View doctors, medical registration details, fees, and consultation schedules.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 5. BOTTOM SECTION: CLINIC INFORMATION & FIXED ENTITY NUMBERING SCHEMES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Clinic Information */}
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
              <span className="font-bold text-primary">30 minutes</span>
            </div>
          </CardContent>
        </Card>

        {/* Fixed Entity Numbering Schemes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              <CardTitle>Fixed Entity Numbering Schemes</CardTitle>
            </div>
            <span className="text-xs text-text-muted">Sequential backend identifiers</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-surface-border bg-surface text-center space-y-1">
                <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Patients</span>
                <div className="text-lg font-bold text-primary font-mono">P-1001</div>
                <p className="text-[11px] text-text-muted">Sequential ID</p>
              </div>

              <div className="p-3.5 rounded-xl border border-surface-border bg-surface text-center space-y-1">
                <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Appointments</span>
                <div className="text-lg font-bold text-primary font-mono">A-2001</div>
                <p className="text-[11px] text-text-muted">Slot booking ID</p>
              </div>

              <div className="p-3.5 rounded-xl border border-surface-border bg-surface text-center space-y-1">
                <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Prescriptions</span>
                <div className="text-lg font-bold text-primary font-mono">RX-3001</div>
                <p className="text-[11px] text-text-muted">Versioned (v1, v2)</p>
              </div>

              <div className="p-3.5 rounded-xl border border-surface-border bg-surface text-center space-y-1">
                <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Invoices</span>
                <div className="text-lg font-bold text-primary font-mono">INV-4001</div>
                <p className="text-[11px] text-text-muted">Billing ID</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
