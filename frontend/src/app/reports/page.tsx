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
  UserPlus,
  RefreshCw,
  Phone,
  Lock,
} from 'lucide-react';

export default function ReportsPage() {
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();

  // Date range defaults (September 2026 active clinical data window)
  const [activeTab, setActiveTab] = useState<'appointments' | 'patients'>('appointments');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctorsList, setDoctorsList] = useState<any[]>([]);

  const [appointmentReport, setAppointmentReport] = useState<any>(null);
  const [patientReport, setPatientReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Fetch doctors for filter
  useEffect(() => {
    api
      .get('/doctors')
      .then((res) => setDoctorsList(res.data.data || []))
      .catch(() => {});
  }, []);

  // Fetch report data based on active tab and filters
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'appointments') {
        const res = await api.get('/reports/appointments', {
          params: {
            startDate,
            endDate,
            doctorId: selectedDoctorId || undefined,
          },
        });
        setAppointmentReport(res.data.data);
      } else {
        const res = await api.get('/reports/patients', {
          params: {
            startDate,
            endDate,
            doctorId: selectedDoctorId || undefined,
          },
        });
        setPatientReport(res.data.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load report analytics', 'error');
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

  // Export report handler
  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    setIsExporting(format);
    try {
      const endpoint =
        activeTab === 'appointments' ? '/reports/appointments/export' : '/reports/patients/export';

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

  const isAdmin = hasRole(['ADMIN']);
  const isDoctor = hasRole(['DOCTOR']);

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
              Phase 7a Scoped
            </Badge>
          </div>
          <p className="text-sm text-text-secondary">
            Filterable analytics and exportable reports for appointments, patient volume, and follow-up tracking.
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

      {/* 3. DATA-DRIVEN REPORT TYPE SELECTOR (EXTENSIBLE FOR PHASE 7b) */}
      <div className="flex flex-wrap items-center justify-between border-b border-surface-border pb-3 gap-2">
        <div className="flex items-center gap-2">
          {/* Active Phase 7a Tabs */}
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

          {/* Phase 7b Extension Placeholders (Disabled) */}
          <div className="flex items-center gap-2 opacity-50 cursor-not-allowed">
            <span className="px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-text-muted text-xs flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-text-muted" />
              Revenue & Payments
              <Badge variant="default" size="sm" className="text-[10px] py-0 px-1">Phase 7b</Badge>
            </span>

            <span className="px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-text-muted text-xs flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-text-muted" />
              Inventory Movement
              <Badge variant="default" size="sm" className="text-[10px] py-0 px-1">Phase 7b</Badge>
            </span>
          </div>
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
          {/* Summary Cards with Gold Accents */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Total Booked
                  </span>
                  <span className="text-2xl font-bold text-text-primary">
                    {isLoading ? '...' : appointmentReport?.summary?.total || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-green-400 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-status-success border border-green-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Completed
                  </span>
                  <span className="text-2xl font-bold text-status-success">
                    {isLoading ? '...' : appointmentReport?.summary?.completed || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-amber-400 transition-colors border-l-4 border-l-accent">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-accent border border-amber-200 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Completion Rate
                  </span>
                  <span className="text-2xl font-bold text-accent">
                    {isLoading ? '...' : `${appointmentReport?.summary?.completionRate || 0}%`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-red-400 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-status-error border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Cancelled / No Show
                  </span>
                  <span className="text-2xl font-bold text-text-primary">
                    {isLoading
                      ? '...'
                      : (appointmentReport?.summary?.cancelled || 0) +
                        (appointmentReport?.summary?.noShow || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Tables & Analytics Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status-wise Breakdown */}
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
                      const badge = STATUS_MAPPINGS[item.status] || {
                        label: item.status,
                        variant: 'default',
                      };
                      return (
                        <div
                          key={item.status}
                          className="p-3.5 flex items-center justify-between hover:bg-surface/50 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={badge.variant} size="sm" dot>
                              {badge.label}
                            </Badge>
                          </div>
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

            {/* Doctor-wise Breakdown */}
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
                      <div
                        key={doc.doctorId}
                        className="p-3.5 flex items-center justify-between hover:bg-surface/50 text-xs"
                      >
                        <div>
                          <span className="font-bold text-text-primary block">{doc.doctorName}</span>
                          <span className="text-text-muted text-[11px]">{doc.specialization}</span>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-text-secondary block">
                              <strong>{doc.completed}</strong> / {doc.total} Visits
                            </span>
                            <span className="text-accent font-bold text-[11px]">
                              {doc.completionRate}% Rate
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Itemized Appointments Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <CardTitle>Filtered Appointment Records ({appointmentReport?.items?.length || 0})</CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-12 flex justify-center text-xs text-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : appointmentReport?.items?.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  No appointments found matching the selected date range and filters.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-surface-border text-text-secondary font-semibold">
                      <th className="p-3">Code</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Doctor</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {appointmentReport?.items?.map((item: any) => {
                      const badge = STATUS_MAPPINGS[item.status] || {
                        label: item.status,
                        variant: 'default',
                      };
                      return (
                        <tr key={item.id} className="hover:bg-surface/50">
                          <td className="p-3 font-mono font-bold text-primary">{item.appointmentCode}</td>
                          <td className="p-3">
                            <span className="font-medium text-text-primary block">{item.appointmentDate}</span>
                            <span className="text-text-muted text-[11px]">{item.startTime} - {item.endTime}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-text-primary block">{item.patientName}</span>
                            <span className="text-text-muted font-mono text-[11px]">{item.patientCode} • {item.patientPhone}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-text-primary block">{item.doctorName}</span>
                            <span className="text-text-muted text-[11px]">{item.specialization}</span>
                          </td>
                          <td className="p-3 font-medium">{item.type}</td>
                          <td className="p-3">
                            <Badge variant={badge.variant} size="sm" dot>
                              {badge.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: PATIENTS & FOLLOW-UPS REPORT VIEW */}
      {/* ============================================================= */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    New Registrations
                  </span>
                  <span className="text-2xl font-bold text-text-primary">
                    {isLoading ? '...' : patientReport?.summary?.totalNewPatients || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-status-success border border-green-200 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Returning Patients
                  </span>
                  <span className="text-2xl font-bold text-status-success">
                    {isLoading ? '...' : patientReport?.summary?.totalReturningPatients || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-amber-400 transition-colors border-l-4 border-l-accent">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-accent border border-amber-200 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Pending Follow-Ups
                  </span>
                  <span className="text-2xl font-bold text-accent">
                    {isLoading ? '...' : patientReport?.summary?.pendingFollowUps || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-red-400 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-status-error border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                    Overdue Follow-Ups
                  </span>
                  <span className="text-2xl font-bold text-status-error">
                    {isLoading ? '...' : patientReport?.summary?.overdueFollowUps || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Follow-Up Call Tracking Section (Supports Reception Day-to-Day Calling) */}
          <Card accentTop>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-accent" />
                <CardTitle>Follow-Up Call Tracking List ({patientReport?.followUps?.length || 0})</CardTitle>
              </div>
              <span className="text-xs text-text-muted">Patients requiring follow-up contact</span>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-text-muted">Loading follow-ups...</div>
              ) : patientReport?.followUps?.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  No pending or overdue patient follow-ups found for the selected range.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-surface-border text-text-secondary font-semibold">
                      <th className="p-3">Patient</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Doctor</th>
                      <th className="p-3">Chief Complaint</th>
                      <th className="p-3">Follow-Up Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {patientReport?.followUps?.map((f: any) => (
                      <tr key={f.consultationId} className="hover:bg-surface/50">
                        <td className="p-3 font-semibold text-text-primary">
                          {f.patientName} <span className="text-text-muted font-mono font-normal">({f.patientCode})</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-primary">{f.patientPhone}</td>
                        <td className="p-3 text-text-secondary">{f.doctorName}</td>
                        <td className="p-3 text-text-secondary">{f.diagnosis || 'General Checkup'}</td>
                        <td className="p-3 font-medium">{f.followUpDate || 'Not Set'}</td>
                        <td className="p-3">
                          {f.isOverdue ? (
                            <Badge variant="danger" size="sm">Overdue Call</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">Pending Call</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* New Patient Registrations */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <CardTitle>New Registered Patients ({patientReport?.newPatients?.length || 0})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-text-muted">Loading registrations...</div>
              ) : patientReport?.newPatients?.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  No new patient registrations recorded within this date range.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-surface-border text-text-secondary font-semibold">
                      <th className="p-3">Code</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Gender / Age</th>
                      <th className="p-3">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {patientReport?.newPatients?.map((p: any) => (
                      <tr key={p.id} className="hover:bg-surface/50">
                        <td className="p-3 font-mono font-bold text-primary">{p.patientCode}</td>
                        <td className="p-3 font-semibold text-text-primary">{p.name}</td>
                        <td className="p-3 text-text-secondary">{p.phone}</td>
                        <td className="p-3 text-text-secondary">
                          {p.gender || 'N/A'} {p.age ? `(${p.age} yrs)` : ''}
                        </td>
                        <td className="p-3 text-text-muted">{p.registeredOn}</td>
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
