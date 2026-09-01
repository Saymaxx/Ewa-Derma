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
import { STATUS_MAPPINGS } from '@/styles/theme';
import {
  Stethoscope,
  Clock,
  User,
  Play,
  CheckCircle2,
  Calendar,
  Activity,
  ArrowRight,
  AlertCircle,
  FileText,
  Loader2,
  Phone,
} from 'lucide-react';

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [queue, setQueue] = useState<any[]>([]);
  const [completedToday, setCompletedToday] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDoctorAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [queueRes, aptsRes] = await Promise.all([
        api.get('/appointments/queue/today', {
          params: { doctorId: user?.doctorId || undefined },
        }),
        api.get('/appointments', {
          params: {
            date: today,
            doctorId: user?.doctorId || undefined,
            status: 'COMPLETED',
          },
        }),
      ]);

      setQueue(queueRes.data.data || []);
      setCompletedToday(aptsRes.data.data || []);
    } catch {
      showToast('Failed to load clinical schedule', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.doctorId, showToast]);

  useEffect(() => {
    fetchDoctorAppointments();
  }, [fetchDoctorAppointments]);

  const handleStartConsultation = async (appointmentId: string) => {
    try {
      // Advance status to IN_CONSULTATION if not already
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: 'IN_CONSULTATION',
      });
      router.push(`/consultations/new?appointmentId=${appointmentId}`);
    } catch (err: any) {
      // If already IN_CONSULTATION, proceed directly
      router.push(`/consultations/new?appointmentId=${appointmentId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Doctor Clinical Workspace
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Welcome, <strong>Dr. {user?.firstName} {user?.lastName}</strong>. Today's live patient queue & consultations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="primary" size="md">
            {queue.length} In Clinic Queue
          </Badge>
          <Badge variant="success" size="md">
            {completedToday.length} Completed Today
          </Badge>
        </div>
      </div>

      {/* 1. ACTIVE & WAITING PATIENTS QUEUE */}
      <Card accentTop>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent animate-pulse" />
            <CardTitle>Waiting Room & In-Consultation Queue</CardTitle>
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
              <p className="font-semibold text-text-primary">No patients currently waiting</p>
              <p className="text-[11px]">When the front desk checks in patients, they will appear here instantly.</p>
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
                            <strong>Reason:</strong> {item.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Link href={`/patients/${item.patient?.id}`}>
                        <Button size="sm" variant="outline">
                          View Profile
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

      {/* 2. COMPLETED CONSULTATIONS TODAY */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-status-success" />
            <CardTitle>Completed Consultations (Today)</CardTitle>
          </div>
          <span className="text-xs text-text-muted">{completedToday.length} Patients Seen</span>
        </CardHeader>
        <CardContent className="p-0">
          {completedToday.length === 0 ? (
            <div className="p-8 text-center text-text-secondary text-xs">
              No completed consultations recorded yet today.
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {completedToday.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 flex items-center justify-between hover:bg-surface/50 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-text-primary text-sm">
                      {apt.patient?.firstName} {apt.patient?.lastName}
                    </span>
                    <span className="text-text-muted ml-2 font-mono">{apt.patient?.patientCode}</span>
                    <p className="text-text-secondary text-[11px]">
                      Slot: {apt.startTime} - {apt.endTime} • Completed at{' '}
                      {apt.completedAt
                        ? new Date(apt.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : 'Today'}
                    </p>
                  </div>

                  <Link href={`/patients/${apt.patient?.id}`}>
                    <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      View Records
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
