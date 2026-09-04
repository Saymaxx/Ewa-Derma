'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { STATUS_MAPPINGS } from '@/styles/theme';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  UserCheck,
  UserX,
  XCircle,
  Loader2,
  Stethoscope,
  Activity,
  ArrowRight,
  Filter,
} from 'lucide-react';

import { getCachedData, setCachedData } from '@/lib/cache';

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams?.get('patientId');
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  const [bookForm, setBookForm] = useState({
    doctorId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '10:30',
    type: 'CONSULTATION',
    reason: '',
    notes: '',
    isWalkIn: false,
  });

  // Action status modal
  const [cancelModalData, setCancelModalData] = useState<{ id: string; code: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // 1. Fetch Doctors List
  const fetchDoctors = useCallback(async () => {
    try {
      const cached = getCachedData<any[]>('doctors_list');
      if (cached) {
        setDoctors(cached);
        if (cached.length > 0 && !bookForm.doctorId) {
          setBookForm((prev) => ({ ...prev, doctorId: cached[0].id }));
        }
        return;
      }
      const res = await api.get('/doctors');
      const docs = res.data.data || [];
      setCachedData('doctors_list', docs, 300000); // 5 min TTL
      setDoctors(docs);
      if (docs.length > 0 && !bookForm.doctorId) {
        setBookForm((prev) => ({ ...prev, doctorId: docs[0].id }));
      }
    } catch {
      showToast('Failed to load doctors list', 'error');
    }
  }, [bookForm.doctorId, showToast]);

  // 2. Fetch Appointments & Live Queue
  const fetchAppointmentsAndQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const [aptRes, queueRes] = await Promise.all([
        api.get('/appointments', {
          params: {
            date: selectedDate,
            doctorId: selectedDoctorId || undefined,
            status: selectedStatus || undefined,
          },
        }),
        api.get('/appointments/queue/today', {
          params: {
            doctorId: selectedDoctorId || undefined,
          },
        }),
      ]);

      setAppointments(aptRes.data.data || []);
      setQueue(queueRes.data.data || []);
    } catch (err: any) {
      showToast('Failed to load appointments', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedDoctorId, selectedStatus, showToast]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    fetchAppointmentsAndQueue();
  }, [fetchAppointmentsAndQueue]);

  // Handle preselected patient from URL
  useEffect(() => {
    if (preselectedPatientId) {
      api.get(`/patients/${preselectedPatientId}`).then((res) => {
        if (res.data?.data) {
          setSelectedPatient(res.data.data);
          setIsBookModalOpen(true);
        }
      });
    }
  }, [preselectedPatientId]);

  // Debounced Patient Search inside Booking Modal
  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearchingPatient(true);
      try {
        const res = await api.get('/patients', {
          params: { search: patientSearch, limit: 5 },
        });
        setPatientResults(res.data.data.items || []);
      } catch {
        // Ignore
      } finally {
        setIsSearchingPatient(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [patientSearch]);

  // Slot Calculation Helper
  const handleStartTimeChange = (startTime: string) => {
    // Automatically set end time to 30 mins later
    const [h, m] = startTime.split(':').map(Number);
    let totalMins = h * 60 + m + 30;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    setBookForm((prev) => ({ ...prev, startTime, endTime }));
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      showToast('Please select or create a patient first', 'warning');
      return;
    }
    if (!bookForm.doctorId) {
      showToast('Please select a doctor', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/appointments', {
        patientId: selectedPatient.id,
        doctorId: bookForm.doctorId,
        appointmentDate: bookForm.appointmentDate,
        startTime: bookForm.startTime,
        endTime: bookForm.endTime,
        type: bookForm.type,
        reason: bookForm.reason,
        notes: bookForm.notes,
        isWalkIn: bookForm.isWalkIn,
      });

      const newApt = res.data.data;
      showToast(
        `Appointment ${newApt.appointmentCode} booked for ${selectedPatient.firstName} ${selectedPatient.lastName}`,
        'success',
        'Booking Confirmed',
      );

      setIsBookModalOpen(false);
      setSelectedPatient(null);
      setPatientSearch('');
      fetchAppointmentsAndQueue();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to book appointment';
      showToast(msg, 'error', 'Booking Conflict / Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusTransition = async (appointmentId: string, newStatus: string, comment?: string) => {
    try {
      const res = await api.patch(`/appointments/${appointmentId}/status`, {
        status: newStatus,
        comment,
      });

      const updated = res.data.data;
      showToast(
        `Appointment ${updated.appointmentCode} updated to "${newStatus}"`,
        'success',
        'Status Advanced',
      );
      fetchAppointmentsAndQueue();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Invalid status transition';
      showToast(msg, 'error', 'Status Change Failed');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalData) return;
    try {
      await api.patch(`/appointments/${cancelModalData.id}/status`, {
        status: 'CANCELLED',
        cancellationReason: cancelReason || 'Cancelled by Reception',
      });
      showToast(`Appointment ${cancelModalData.code} has been cancelled`, 'success', 'Cancelled');
      setCancelModalData(null);
      setCancelReason('');
      fetchAppointmentsAndQueue();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to cancel appointment';
      showToast(msg, 'error');
    }
  };

  const isReceptionOrAdmin = hasRole(['ADMIN', 'RECEPTIONIST']);

  // Available Time Slots from 10:00 to 18:30 (30 min increments)
  const timeSlots: string[] = [];
  for (let hour = 10; hour < 19; hour++) {
    timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < 18 || (hour === 18 && false)) {
      timeSlots.push(`${String(hour).padStart(2, '0')}:30`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Appointments & Booking Schedule
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Manage patient appointments, doctor schedules, and front desk check-in.
          </p>
        </div>

        {isReceptionOrAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<UserCheck className="w-4 h-4 text-accent" />}
              onClick={() => {
                setBookForm((prev) => ({ ...prev, isWalkIn: true }));
                setIsBookModalOpen(true);
              }}
            >
              Walk-in Check-In
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setBookForm((prev) => ({ ...prev, isWalkIn: false }));
                setIsBookModalOpen(true);
              }}
            >
              Book Appointment
            </Button>
          </div>
        )}
      </div>

      {/* 2. FILTERABLE SCHEDULE LIST */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <CardTitle>Appointment Schedule & Master Calendar</CardTitle>
          </div>
          <span className="text-xs text-text-muted">{appointments.length} Total</span>
        </CardHeader>

        {/* Filter Controls */}
        <div className="p-4 border-b border-surface-border bg-surface/50 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
              Select Date
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm bg-white focus:outline-none focus:border-primary"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
              Filter Doctor
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm bg-white focus:outline-none focus:border-primary"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.user?.firstName} {d.user?.lastName} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
              Filter Status
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm bg-white focus:outline-none focus:border-primary"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="WAITING">Waiting</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setSelectedDoctorId('');
                setSelectedStatus('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center text-text-secondary text-xs">
              No appointments found matching the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((apt) => {
                  const statusBadge = STATUS_MAPPINGS[apt.status] || { label: apt.status, variant: 'default' };
                  return (
                    <TableRow key={apt.id}>
                      <TableCell className="font-mono font-bold text-primary">
                        {apt.appointmentCode}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/patients/${apt.patient?.id}`}
                          className="font-medium hover:text-primary transition-colors block"
                        >
                          {apt.patient?.firstName} {apt.patient?.lastName}
                        </Link>
                        <span className="text-[11px] text-text-muted">
                          {apt.patient?.patientCode} • {apt.patient?.phone}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs">
                        Dr. {apt.doctor?.user?.firstName} {apt.doctor?.user?.lastName}
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-medium">
                          {new Date(apt.appointmentDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                        <div className="font-mono text-text-secondary text-[11px]">
                          {apt.startTime} - {apt.endTime}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-medium text-text-secondary">
                          {apt.type}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge variant={statusBadge.variant} size="sm" dot>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Status Advancement Triggers */}
                          {apt.status === 'SCHEDULED' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusTransition(apt.id, 'CONFIRMED')}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleStatusTransition(apt.id, 'CHECKED_IN')}
                              >
                                Check In
                              </Button>
                            </>
                          )}

                          {apt.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleStatusTransition(apt.id, 'CHECKED_IN')}
                            >
                              Check In
                            </Button>
                          )}

                          {/* Cancel / No-Show for pending states */}
                          {['SCHEDULED', 'CONFIRMED'].includes(apt.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-status-danger hover:bg-red-50"
                              onClick={() => setCancelModalData({ id: apt.id, code: apt.appointmentCode })}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Book Appointment / Walk-in Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title={bookForm.isWalkIn ? 'Walk-in Immediate Check-In' : 'Book Appointment'}
        description="Select patient, doctor, date, and 30-minute time slot."
        maxWidth="lg"
      >
        <form onSubmit={handleBookAppointment} className="space-y-4">
          {/* Patient Search / Selected Patient */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-primary">
              Patient Selection <span className="text-status-danger">*</span>
            </label>

            {selectedPatient ? (
              <div className="p-3 rounded-lg bg-primary-50/60 border border-primary-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-primary text-sm">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </span>
                  <div className="text-xs text-text-secondary">
                    {selectedPatient.patientCode} • Mobile: {selectedPatient.phone}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPatient(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2 relative">
                <Input
                  placeholder="Type name, phone, or P-xxxx to search patient..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-text-muted" />}
                />
                {isSearchingPatient && (
                  <div className="text-xs text-text-muted flex items-center gap-1.5 p-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                  </div>
                )}
                {patientResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-surface-border rounded-lg shadow-lg divide-y max-h-48 overflow-y-auto">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientResults([]);
                          setPatientSearch('');
                        }}
                        className="w-full p-2.5 text-left hover:bg-primary-50 transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-text-primary">
                            {p.firstName} {p.lastName}
                          </span>
                          <span className="text-text-muted ml-2">({p.phone})</span>
                        </div>
                        <span className="font-mono text-primary font-semibold">
                          {p.patientCode}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Doctor <span className="text-status-danger">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary"
              value={bookForm.doctorId}
              onChange={(e) => setBookForm({ ...bookForm, doctorId: e.target.value })}
              required
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.user?.firstName} {d.user?.lastName} — {d.specialization} (Fee: ₹{d.consultationFee} | Days: {d.workingDays || 'Mon-Sun'})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Slot Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Appointment Date"
              type="date"
              required
              value={bookForm.appointmentDate}
              onChange={(e) => setBookForm({ ...bookForm, appointmentDate: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Time Slot (30 Min)
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary"
                value={bookForm.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot} (30 mins)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Appointment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Appointment Type
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary"
                value={bookForm.type}
                onChange={(e) => setBookForm({ ...bookForm, type: e.target.value })}
              >
                <option value="CONSULTATION">Consultation</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="PROCEDURE">Procedure (Laser/Peel/PRP)</option>
              </select>
            </div>

            <Input
              label="Reason / Chief Complaint"
              placeholder="e.g. Skin rash, Acne checkup"
              value={bookForm.reason}
              onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBookModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              {bookForm.isWalkIn ? 'Check In Walk-in' : 'Confirm Booking'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Reason Modal */}
      <Modal
        isOpen={!!cancelModalData}
        onClose={() => setCancelModalData(null)}
        title="Cancel Appointment"
        description={`Provide a reason for cancelling appointment ${cancelModalData?.code}.`}
      >
        <div className="space-y-4">
          <Input
            label="Cancellation Reason"
            placeholder="e.g. Patient called to cancel / Doctor unavailable"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button variant="outline" onClick={() => setCancelModalData(null)}>
              Dismiss
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
