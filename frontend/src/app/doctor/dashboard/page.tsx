'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { STATUS_MAPPINGS } from '@/styles/theme';
import {
  Stethoscope,
  Clock,
  UserCheck,
  Play,
  CheckCircle2,
  Calendar,
  Activity,
  ArrowRight,
  FileText,
  Loader2,
  Phone,
  Search,
  Users,
  Award,
  BookOpen,
  Filter,
  UserCog,
} from 'lucide-react';

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [queue, setQueue] = useState<any[]>([]);
  const [doctorAppointments, setDoctorAppointments] = useState<any[]>([]);
  const [doctorRoster, setDoctorRoster] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'all' | 'roster'>('queue');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  // 1. Fetch Doctor's Queue, All Appointments for this Doctor, and Doctor Roster
  const fetchDoctorData = useCallback(async () => {
    setIsLoading(true);
    try {
      const docId = user?.doctorId || undefined;
      const [queueRes, aptsRes, docsRes] = await Promise.all([
        api.get('/appointments/queue/today', {
          params: { doctorId: docId },
        }),
        api.get('/appointments', {
          params: {
            doctorId: docId,
            date: selectedDateFilter || undefined,
          },
        }),
        api.get('/doctors'),
      ]);

      setQueue(queueRes.data.data || []);
      setDoctorAppointments(aptsRes.data.data || []);
      setDoctorRoster(docsRes.data.data || []);
    } catch {
      showToast('Failed to load clinical workspace data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.doctorId, selectedDateFilter, showToast]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  const handleStartConsultation = async (appointmentId: string) => {
    try {
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: 'IN_CONSULTATION',
      });
      router.push(`/consultations/new?appointmentId=${appointmentId}`);
    } catch {
      router.push(`/consultations/new?appointmentId=${appointmentId}`);
    }
  };

  // Filter doctor appointments by patient search
  const filteredAppointments = doctorAppointments.filter((apt) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    const name = `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.toLowerCase();
    const code = (apt.patient?.patientCode || '').toLowerCase();
    const phone = (apt.patient?.phone || '').toLowerCase();
    return name.includes(q) || code.includes(q) || phone.includes(q);
  });

  const completedToday = doctorAppointments.filter((a) => a.status === 'COMPLETED');

  // Find logged in doctor details from roster
  const myDoctorProfile = doctorRoster.find((d) => d.id === user?.doctorId) || {
    specialization: 'Dermatology & Cosmetology',
    regNumber: 'UPMC-78452',
    consultationFee: 500,
    workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
    workingHours: '10:00 - 19:00',
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP DOCTOR WELCOME & PROFILE BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary via-primary-600 to-primary-dark p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-accent-light" />
            <h1 className="text-2xl font-bold font-serif tracking-tight">
              Dr. {user?.firstName} {user?.lastName}
            </h1>
            <Badge variant="accent" className="ml-1 uppercase text-xs">
              {myDoctorProfile.specialization || 'Dermatologist'}
            </Badge>
          </div>
          <p className="text-primary-100 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Reg. No: <strong>{myDoctorProfile.regNumber || 'UPMC-78452'}</strong></span>
            <span>•</span>
            <span>Fee: <strong>₹{myDoctorProfile.consultationFee || 500}</strong></span>
            <span>•</span>
            <span>Hours: <strong>{myDoctorProfile.workingHours || '10:00 - 19:00'}</strong></span>
          </p>
        </div>

        <div className="z-10 flex items-center gap-3">
          {queue.length > 0 && (
            <Button
              variant="accent"
              size="sm"
              leftIcon={<Play className="w-4 h-4" />}
              onClick={() => handleStartConsultation(queue[0].id)}
            >
              Consult Next Patient
            </Button>
          )}
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-accent/15 blur-2xl pointer-events-none" />
      </div>

      {/* 2. DOCTOR METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="hover:border-accent/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-accent border border-amber-200 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                Waiting In Queue
              </span>
              <span className="text-2xl font-bold text-accent">
                {isLoading ? '...' : queue.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-status-success border border-green-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                Completed (Selected Date)
              </span>
              <span className="text-2xl font-bold text-text-primary">
                {isLoading ? '...' : completedToday.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                Total Scheduled
              </span>
              <span className="text-2xl font-bold text-text-primary">
                {isLoading ? '...' : doctorAppointments.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                Clinic Doctors
              </span>
              <span className="text-2xl font-bold text-text-primary">
                {isLoading ? '...' : doctorRoster.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. NAVIGATION TABS: QUEUE | MY APPOINTMENTS & PATIENTS | DOCTOR ROSTER */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3 gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface text-text-secondary hover:bg-gray-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Patient Queue ({queue.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface text-text-secondary hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            My Doctor Appointments ({doctorAppointments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface text-text-secondary hover:bg-gray-100'
            }`}
          >
            <UserCog className="w-4 h-4" />
            Doctor Roster ({doctorRoster.length})
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="py-1 text-xs"
            />
          </div>
        )}
      </div>

      {/* TAB 1: LIVE PATIENT QUEUE */}
      {activeTab === 'queue' && (
        <Card accentTop>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent animate-pulse" />
              <CardTitle>Waiting Room & Consultation Queue</CardTitle>
            </div>
            <span className="text-xs text-text-muted">Sorted by check-in arrival</span>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-text-secondary">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Loading patient queue...</p>
              </div>
            ) : queue.length === 0 ? (
              <div className="p-12 text-center text-text-secondary text-xs space-y-2">
                <Stethoscope className="w-10 h-10 text-text-muted mx-auto" />
                <p className="font-semibold text-text-primary">No patients currently waiting in queue</p>
                <p className="text-[11px]">When patients check in at reception, they will appear here instantly.</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-border">
                {queue.map((item, idx) => {
                  const statusBadge = STATUS_MAPPINGS[item.status] || { label: item.status, variant: 'default' };
                  const isCurrentlyActive = item.status === 'IN_CONSULTATION';

                  return (
                    <div
                      key={item.id}
                      className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                        isCurrentlyActive ? 'bg-primary-50/40 border-l-4 border-l-primary' : 'hover:bg-surface/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-surface-border text-primary font-bold text-sm flex items-center justify-center shadow-xs">
                          {idx + 1}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/patients/${item.patient?.id}`}
                              className="font-bold text-text-primary text-base hover:text-primary transition-colors"
                            >
                              {item.patient?.firstName} {item.patient?.lastName}
                            </Link>
                            <Badge variant="primary" size="sm" className="font-mono font-bold">
                              {item.patient?.patientCode}
                            </Badge>
                            <Badge variant={statusBadge.variant} size="sm" dot>
                              {statusBadge.label}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 text-xs text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-text-muted" />
                              {item.patient?.phone}
                            </span>
                            <span>•</span>
                            <span>Slot: {item.startTime} - {item.endTime}</span>
                            <span>•</span>
                            <span>Type: <strong>{item.type}</strong></span>
                            {item.checkedInAt && (
                              <>
                                <span>•</span>
                                <span className="text-accent font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Checked in at {new Date(item.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </>
                            )}
                          </div>

                          {item.reason && (
                            <p className="text-xs text-text-muted pt-1">
                              <strong>Reason for Visit:</strong> {item.reason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Link href={`/patients/${item.patient?.id}`}>
                          <Button size="sm" variant="outline">
                            View Patient Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant={isCurrentlyActive ? 'accent' : 'primary'}
                          leftIcon={<Play className="w-4 h-4" />}
                          onClick={() => handleStartConsultation(item.id)}
                        >
                          {isCurrentlyActive ? 'Resume Consultation' : 'Start Consultation'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: MY APPOINTMENTS & PATIENT LIST FOR THIS DOCTOR */}
      {activeTab === 'all' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <CardTitle>My Registered Doctor Appointments</CardTitle>
              </div>
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Search patient name, phone, code..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-text-muted" />}
                  className="py-1.5 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredAppointments.length === 0 ? (
              <div className="p-12 text-center text-text-secondary text-xs">
                No appointments found for Dr. {user?.lastName} on {selectedDateFilter}.
              </div>
            ) : (
              <div className="divide-y divide-surface-border">
                {filteredAppointments.map((apt) => {
                  const statusBadge = STATUS_MAPPINGS[apt.status] || { label: apt.status, variant: 'default' };
                  return (
                    <div
                      key={apt.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface/50 text-xs transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/patients/${apt.patient?.id}`}
                            className="font-bold text-text-primary text-sm hover:text-primary transition-colors"
                          >
                            {apt.patient?.firstName} {apt.patient?.lastName}
                          </Link>
                          <span className="font-mono text-primary font-bold">{apt.patient?.patientCode}</span>
                          <span className="font-mono text-text-muted text-[11px]">({apt.appointmentCode})</span>
                          <Badge variant={statusBadge.variant} size="sm" dot>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-text-secondary text-xs">
                          <span>Phone: <strong>{apt.patient?.phone}</strong></span>
                          <span>•</span>
                          <span>Time: {apt.startTime} - {apt.endTime}</span>
                          <span>•</span>
                          <span>Type: {apt.type}</span>
                        </div>
                        {apt.reason && (
                          <p className="text-text-muted text-[11px]">
                            Reason: {apt.reason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/patients/${apt.patient?.id}`}>
                          <Button size="sm" variant="outline">
                            View Patient Records
                          </Button>
                        </Link>
                        {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                          <Button
                            size="sm"
                            variant="primary"
                            leftIcon={<Play className="w-3.5 h-3.5" />}
                            onClick={() => handleStartConsultation(apt.id)}
                          >
                            Consult
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: DOCTOR ROSTER VIEW */}
      {activeTab === 'roster' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              <CardTitle>Ewa Derma Clinic — Doctor Roster</CardTitle>
            </div>
            <span className="text-xs text-text-muted">Active Dermatologists & Cosmetologists</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-surface-border">
              {doctorRoster.map((doc) => {
                const isMe = doc.id === user?.doctorId;
                return (
                  <div
                    key={doc.id}
                    className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isMe ? 'bg-primary-50/30' : 'hover:bg-surface/50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-base">
                          Dr. {doc.user?.firstName} {doc.user?.lastName}
                        </span>
                        {isMe && <Badge variant="accent" size="sm">You</Badge>}
                        <Badge variant="primary" size="sm">{doc.specialization}</Badge>
                      </div>
                      <p className="text-xs text-text-secondary flex flex-wrap items-center gap-x-3">
                        <span>Qualification: <strong>{doc.qualification}</strong></span>
                        <span>•</span>
                        <span>Reg. No: <strong>{doc.regNumber}</strong></span>
                        <span>•</span>
                        <span>Fee: <strong>₹{doc.consultationFee}</strong></span>
                      </p>
                      <p className="text-xs text-text-muted flex items-center gap-2 pt-0.5">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        <span>Working Days: <strong>{doc.workingDays}</strong> ({doc.workingHours})</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
