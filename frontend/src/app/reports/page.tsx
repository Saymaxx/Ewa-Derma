'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { STATUS_MAPPINGS } from '@/styles/theme';
import {
  BarChart3,
  Calendar,
  Users,
  CreditCard,
  Package,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  Stethoscope,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  RefreshCw,
  Phone,
  IndianRupee,
  PieChart,
  TrendingUp,
} from 'lucide-react';

import { getCachedData, setCachedData } from '@/lib/cache';

export default function ReportsPage() {
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();

  const isAdmin = hasRole(['ADMIN']);
  const isDoctor = hasRole(['DOCTOR']);
  const isInventoryManager = hasRole(['INVENTORY_MANAGER']);

  // Date range defaults (September 2026 active clinical data window)
  const [activeTab, setActiveTab] = useState<'appointments' | 'patients' | 'revenue' | 'inventory'>('appointments');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctorsList, setDoctorsList] = useState<any[]>([]);

  // Report Data States
  const [appointmentReport, setAppointmentReport] = useState<any>(null);
  const [patientReport, setPatientReport] = useState<any>(null);
  const [revenueReport, setRevenueReport] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Fetch doctors for filter dropdown
  useEffect(() => {
    const cached = getCachedData<any[]>('doctors_list');
    if (cached) {
      setDoctorsList(cached);
      return;
    }
    api
      .get('/doctors')
      .then((res) => {
        const docs = res.data.data || [];
        setDoctorsList(docs);
        setCachedData('doctors_list', docs);
      })
      .catch(() => {});
  }, []);

  // Fetch report data based on active tab and filters
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'appointments') {
        const res = await api.get('/reports/appointments', {
          params: { startDate, endDate, doctorId: selectedDoctorId || undefined },
        });
        setAppointmentReport(res.data.data);
      } else if (activeTab === 'patients') {
        const res = await api.get('/reports/patients', {
          params: { startDate, endDate, doctorId: selectedDoctorId || undefined },
        });
        setPatientReport(res.data.data);
      } else if (activeTab === 'revenue') {
        const res = await api.get('/reports/revenue', {
          params: { startDate, endDate, doctorId: selectedDoctorId || undefined },
        });
        setRevenueReport(res.data.data);
      } else if (activeTab === 'inventory') {
        const res = await api.get('/reports/inventory', {
          params: { startDate, endDate },
        });
        setInventoryReport(res.data.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load report analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, startDate, endDate, selectedDoctorId, showToast]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Preset Date Ranges
  const applyPresetDate = (type: 'today' | '7days' | 'month' | '30days' | 'all') => {
    if (type === 'today') {
      setStartDate('2026-09-02');
      setEndDate('2026-09-02');
    } else if (type === '7days') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-07');
    } else if (type === 'month') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-30');
    } else if (type === '30days') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-30');
    } else if (type === 'all') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    }
  };

  // Export report handler (Reuses Phase 7a export mechanism)
  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    setIsExporting(format);
    try {
      const endpoint = `/reports/${activeTab}/export`;

      const response = await api.get(endpoint, {
        params: {
          format,
          startDate,
          endDate,
          doctorId: selectedDoctorId || undefined,
        },
        responseType: 'blob',
      });

      const mimeType =
        format === 'pdf'
          ? 'application/pdf'
          : format === 'csv'
          ? 'text/csv'
          : 'application/vnd.ms-excel';
      const extension = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xls';

      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `ewa-derma-${activeTab}-report-${startDate}-to-${endDate}.${extension}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast(`Exported ${activeTab} report to ${format.toUpperCase()} successfully`, 'success');
    } catch {
      showToast(`Failed to export ${format.toUpperCase()} report`, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER & EXPORT ACTION CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Clinical Reports & Analytics
            </h1>
            <Badge variant="accent" size="sm">
              Full Analytics
            </Badge>
          </div>
          <p className="text-sm text-text-secondary">
            Unified clinic reporting module for appointments, patient registrations, financial revenue, and inventory movements.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            isLoading={isExporting === 'pdf'}
            leftIcon={<FileText className="w-4 h-4 text-red-600" />}
          >
            Export PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            isLoading={isExporting === 'excel'}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Export Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            isLoading={isExporting === 'csv'}
            leftIcon={<FileCode className="w-4 h-4 text-blue-600" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* 2. FILTER CONTROL BAR */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          {/* Date Pickers */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="py-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="py-1 text-xs"
              />
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1 pt-4">
              <button
                type="button"
                onClick={() => applyPresetDate('today')}
                className="px-2.5 py-1 text-xs rounded-lg border border-surface-border bg-surface hover:bg-gray-100 font-medium text-text-secondary"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPresetDate('7days')}
                className="px-2.5 py-1 text-xs rounded-lg border border-surface-border bg-surface hover:bg-gray-100 font-medium text-text-secondary"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => applyPresetDate('month')}
                className="px-2.5 py-1 text-xs rounded-lg border border-surface-border bg-surface hover:bg-gray-100 font-medium text-text-secondary"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyPresetDate('30days')}
                className="px-2.5 py-1 text-xs rounded-lg border border-surface-border bg-surface hover:bg-gray-100 font-medium text-text-secondary"
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => applyPresetDate('all')}
                className="px-2.5 py-1 text-xs rounded-lg border border-primary/30 bg-primary-50 hover:bg-primary-100 font-semibold text-primary"
              >
                All Records (2026)
              </button>
            </div>
          </div>

          {/* Doctor Filter (For Admin / Receptionist) */}
          {isAdmin && (
            <div className="w-full md:w-64">
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Doctor Filter
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
              >
                <option value="">All Doctors (Clinic-wide)</option>
                {doctorsList.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.user?.firstName} {doc.user?.lastName} ({doc.specialization})
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. EXTENSIBLE TAB REGISTRY SELECTOR (PHASE 7b COMPLETE) */}
      <div className="flex flex-wrap items-center justify-between border-b border-surface-border pb-3 gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'appointments'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface text-text-secondary hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Appointments Report
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'patients'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface text-text-secondary hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Patients & Follow-Ups
          </button>

          {(isAdmin || isDoctor) && (
            <button
              type="button"
              onClick={() => setActiveTab('revenue')}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'revenue'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-text-secondary hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-4 h-4 text-amber-300" />
              Revenue & Payments
            </button>
          )}

          {(isAdmin || isInventoryManager) && (
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'inventory'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-text-secondary hover:bg-gray-100'
              }`}
            >
              <Package className="w-4 h-4 text-emerald-300" />
              Inventory Movement
            </button>
          )}
        </div>

        <span className="text-xs text-text-muted">
          Active Filter: <strong>{startDate}</strong> to <strong>{endDate}</strong>
        </span>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: APPOINTMENTS REPORT VIEW */}
      {/* ============================================================= */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">Total Booked</span>
                  <span className="text-2xl font-bold text-text-primary">{isLoading ? '...' : appointmentReport?.summary?.total || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-green-400 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-status-success border border-green-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">Completed</span>
                  <span className="text-2xl font-bold text-status-success">{isLoading ? '...' : appointmentReport?.summary?.completed || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-amber-400 transition-colors border-l-4 border-l-accent">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-accent border border-amber-200 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">Completion Rate</span>
                  <span className="text-2xl font-bold text-accent">{isLoading ? '...' : `${appointmentReport?.summary?.completionRate || 0}%`}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-red-400 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-status-error border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">Cancelled / No Show</span>
                  <span className="text-2xl font-bold text-text-primary">{isLoading ? '...' : (appointmentReport?.summary?.cancelled || 0) + (appointmentReport?.summary?.noShow || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card accentTop>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <CardTitle>Status-Wise Distribution</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-text-muted">Loading breakdown...</div>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {appointmentReport?.statusBreakdown?.map((item: any) => {
                      const badge = STATUS_MAPPINGS[item.status] || { label: item.status, variant: 'default' };
                      return (
                        <div key={item.status} className="p-3.5 flex items-center justify-between hover:bg-surface/50 text-xs">
                          <Badge variant={badge.variant} size="sm" dot>{badge.label}</Badge>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-text-primary font-mono">{item.count}</span>
                            <span className="text-text-muted w-10 text-right">{item.percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card accentTop>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-accent" />
                  <CardTitle>Doctor Completion Performance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-text-muted">Loading doctor stats...</div>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {appointmentReport?.doctorBreakdown?.map((doc: any) => (
                      <div key={doc.doctorId} className="p-3.5 flex items-center justify-between hover:bg-surface/50 text-xs">
                        <div>
                          <span className="font-bold text-text-primary block">{doc.doctorName}</span>
                          <span className="text-text-muted text-[11px]">{doc.specialization}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-text-secondary block"><strong>{doc.completed}</strong> / {doc.total} Visits</span>
                          <span className="text-accent font-bold text-[11px]">{doc.completionRate}% Rate</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: PATIENTS & FOLLOW-UPS REPORT VIEW */}
      {/* ============================================================= */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">New Registrations</span>
                  <span className="text-2xl font-bold text-text-primary">{isLoading ? '...' : patientReport?.summary?.totalNewPatients || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-status-success border border-green-200 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">Returning Patients</span>
                  <span className="text-2xl font-bold text-status-success">{isLoading ? '...' : patientReport?.summary?.totalReturningPatients || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-amber-400 transition-colors border-l-4 border-l-accent">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-accent border border-amber-200 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">Pending Follow-Ups</span>
                  <span className="text-2xl font-bold text-accent">{isLoading ? '...' : patientReport?.summary?.pendingFollowUps || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-red-400 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-status-error border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">Overdue Follow-Ups</span>
                  <span className="text-2xl font-bold text-status-error">{isLoading ? '...' : patientReport?.summary?.overdueFollowUps || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: REVENUE & PAYMENTS REPORT VIEW (PHASE 7B) */}
      {/* ============================================================= */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-accent hover:border-amber-400 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-accent border border-amber-200 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Collected Revenue (Net)
                  </span>
                  <span className="text-2xl font-bold text-emerald-700">
                    {isLoading ? '...' : `₹${revenueReport?.summary?.collectedRevenue?.toLocaleString() || 0}`}
                  </span>
                  <span className="text-[10px] text-text-muted block">Actual cash/UPI received</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-primary border border-purple-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Billed Revenue (Invoiced)
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {isLoading ? '...' : `₹${revenueReport?.summary?.billedRevenue?.toLocaleString() || 0}`}
                  </span>
                  <span className="text-[10px] text-text-muted block">Total invoiced value</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-red-300 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-red-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Outstanding Due
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    {isLoading ? '...' : `₹${revenueReport?.summary?.totalOutstandingDue?.toLocaleString() || 0}`}
                  </span>
                  <span className="text-[10px] text-text-muted block">Unpaid invoice balance</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-amber-300 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Refunds Issued
                  </span>
                  <span className="text-2xl font-bold text-amber-800">
                    {isLoading ? '...' : `₹${revenueReport?.summary?.totalRefundsIssued?.toLocaleString() || 0}`}
                  </span>
                  <span className="text-[10px] text-text-muted block">Deducted from collected</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Payment Method Breakdown */}
            <Card accentTop>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  <CardTitle>Payment Method Breakdown</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-text-muted">Loading breakdown...</div>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {revenueReport?.paymentMethodBreakdown?.map((pm: any) => (
                      <div key={pm.method} className="p-3.5 flex items-center justify-between hover:bg-surface/50 text-xs">
                        <span className="font-bold text-text-primary">{pm.method}</span>
                        <div className="text-right">
                          <span className="font-bold text-emerald-700 block">₹{pm.amount?.toLocaleString()}</span>
                          <span className="text-text-muted text-[11px]">{pm.count} txns ({pm.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Doctor Revenue Attribution */}
            <Card accentTop>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-accent" />
                  <CardTitle>Doctor Revenue Contribution</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-text-muted">Loading doctor stats...</div>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {revenueReport?.doctorBreakdown?.map((doc: any) => (
                      <div key={doc.doctorId} className="p-3.5 flex items-center justify-between hover:bg-surface/50 text-xs">
                        <span className="font-bold text-text-primary block">{doc.doctorName}</span>
                        <div className="text-right">
                          <span className="font-bold text-primary block">Billed: ₹{doc.billed?.toLocaleString()}</span>
                          <span className="text-emerald-700 font-semibold text-[11px]">Collected: ₹{doc.collected?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service-wise Revenue */}
            <Card accentTop>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <CardTitle>Top Revenue Services</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-text-muted">Loading services...</div>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {revenueReport?.serviceBreakdown?.slice(0, 5).map((srv: any) => (
                      <div key={srv.description} className="p-3.5 flex items-center justify-between hover:bg-surface/50 text-xs">
                        <div>
                          <span className="font-bold text-text-primary block">{srv.description}</span>
                          <span className="text-text-muted text-[11px]">{srv.itemType} • Qty {srv.totalQty}</span>
                        </div>
                        <span className="font-bold text-primary">₹{srv.totalRevenue?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoices List Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <CardTitle>Invoice Records ({revenueReport?.items?.length || 0})</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-12 flex justify-center text-xs text-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : revenueReport?.items?.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">No invoice records found in this range.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-surface-border text-text-secondary font-semibold">
                      <th className="p-3">Invoice Code</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Doctor</th>
                      <th className="p-3">Total Amount</th>
                      <th className="p-3">Paid Amount</th>
                      <th className="p-3">Due Balance</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {revenueReport?.items?.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-surface/50">
                        <td className="p-3 font-mono font-bold text-primary">{inv.invoiceCode}</td>
                        <td className="p-3 text-text-secondary">{inv.createdAt}</td>
                        <td className="p-3 font-semibold text-text-primary">{inv.patientName}</td>
                        <td className="p-3 text-text-secondary">{inv.doctorName}</td>
                        <td className="p-3 font-bold text-text-primary">₹{inv.totalAmount?.toFixed(2)}</td>
                        <td className="p-3 font-bold text-emerald-700">₹{inv.paidAmount?.toFixed(2)}</td>
                        <td className="p-3 font-bold text-red-600">₹{inv.dueAmount?.toFixed(2)}</td>
                        <td className="p-3">
                          <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PARTIALLY_PAID' ? 'warning' : 'default'} size="sm">
                            {inv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: INVENTORY MOVEMENT REPORT VIEW (PHASE 7B) */}
      {/* ============================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-accent hover:border-amber-400 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-accent border border-amber-200 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Total Inventory Value
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {isLoading ? '...' : `₹${inventoryReport?.summary?.totalInventoryValue?.toLocaleString() || 0}`}
                  </span>
                  <span className="text-[10px] text-text-muted block">Reused Phase 5 cost valuation</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Medicines Count
                  </span>
                  <span className="text-2xl font-bold text-text-primary">
                    {isLoading ? '...' : inventoryReport?.summary?.totalMedicinesCount || 0}
                  </span>
                  <span className="text-[10px] text-text-muted block">Active formulary items</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-red-300 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-red-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Low Stock Items
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    {isLoading ? '...' : inventoryReport?.summary?.lowStockCount || 0}
                  </span>
                  <span className="text-[10px] text-text-muted block">At or below minimum threshold</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-emerald-300 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Items Dispensed
                  </span>
                  <span className="text-2xl font-bold text-emerald-700">
                    {isLoading ? '...' : inventoryReport?.summary?.totalItemsDispensed || 0}
                  </span>
                  <span className="text-[10px] text-text-muted block">Total units dispensed in range</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Movement Ledger Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <CardTitle>Stock Movement Ledger ({inventoryReport?.movements?.length || 0})</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-12 flex justify-center text-xs text-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : inventoryReport?.movements?.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">No stock movement transactions recorded in this range.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-surface-border text-text-secondary font-semibold">
                      <th className="p-3">Date</th>
                      <th className="p-3">Medicine</th>
                      <th className="p-3">Batch Number</th>
                      <th className="p-3">Transaction Type</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Performed By</th>
                      <th className="p-3">Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {inventoryReport?.movements?.map((m: any) => (
                      <tr key={m.id} className="hover:bg-surface/50">
                        <td className="p-3 text-text-secondary">{m.date}</td>
                        <td className="p-3 font-semibold text-text-primary">{m.medicineName}</td>
                        <td className="p-3 font-mono text-[11px]">{m.batchNumber}</td>
                        <td className="p-3 font-bold text-primary">{m.type}</td>
                        <td className="p-3 font-bold">
                          <span className={m.direction === 'IN' ? 'text-emerald-700' : 'text-red-600'}>
                            {m.direction === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                        </td>
                        <td className="p-3 text-text-secondary">{m.performedBy}</td>
                        <td className="p-3 text-text-muted text-[11px]">{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
