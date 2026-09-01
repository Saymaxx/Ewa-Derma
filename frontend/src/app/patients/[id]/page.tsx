'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { STATUS_MAPPINGS } from '@/styles/theme';
import {
  User,
  ArrowLeft,
  CalendarPlus,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Stethoscope,
  Pill,
  CreditCard,
  Download,
  Eye,
  Loader2,
  HeartPulse,
  Lock,
} from 'lucide-react';

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user, hasRole } = useAuth();
  const id = params?.id as string;

  const [patient, setPatient] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchPatientData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ptRes, consRes, rxRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/consultations/patient/${id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/prescriptions/patient/${id}`).catch(() => ({ data: { data: [] } })),
      ]);
      setPatient(ptRes.data.data);
      setConsultations(consRes.data.data || []);
      setPrescriptions(rxRes.data.data || []);
    } catch {
      showToast('Patient record not found', 'error');
      router.push('/patients');
    } finally {
      setIsLoading(false);
    }
  }, [id, router, showToast]);

  useEffect(() => {
    if (id) fetchPatientData();
  }, [id, fetchPatientData]);

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading patient record...</p>
      </div>
    );
  }

  if (!patient) return null;

  const isPrivilegedDoctor = hasRole(['ADMIN', 'DOCTOR']);

  const tabs = [
    { id: 'overview', label: 'Overview & Profile', icon: <User className="w-4 h-4" /> },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: <Calendar className="w-4 h-4" />,
      count: patient.appointments?.length || 0,
    },
    {
      id: 'clinical',
      label: 'Clinical Notes',
      icon: <Stethoscope className="w-4 h-4" />,
      count: consultations.length,
    },
    {
      id: 'prescriptions',
      label: 'Prescriptions',
      icon: <Pill className="w-4 h-4" />,
      count: prescriptions.length,
    },
    { id: 'billing', label: 'Billing & Invoices', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Patient Directory
        </Link>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary border border-primary-100 flex items-center justify-center font-bold text-2xl shrink-0">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold font-serif text-text-primary">
                  {patient.firstName} {patient.lastName}
                </h1>
                <Badge variant="primary" size="md" className="font-mono font-bold">
                  {patient.patientCode}
                </Badge>
                {patient.bloodGroup && patient.bloodGroup !== 'UNKNOWN' && (
                  <Badge variant="danger" size="md">
                    Blood: {patient.bloodGroup.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary pt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-text-muted" />
                  {patient.phone}
                </span>
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-text-muted" />
                    {patient.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-text-muted" />
                  Registered:{' '}
                  {new Date(patient.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasRole(['ADMIN', 'RECEPTIONIST']) && (
              <Link href={`/appointments?patientId=${patient.id}`}>
                <Button variant="primary" leftIcon={<CalendarPlus className="w-4 h-4" />}>
                  Book Appointment
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <Card>
        <div className="px-6 pt-2">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <CardContent className="pt-6">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
              {/* Personal & Demographic Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                  Personal & Demographic Information
                </h3>
                <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-surface-border/60">
                    <span className="text-text-muted">Full Name</span>
                    <span className="font-semibold text-text-primary">
                      {patient.firstName} {patient.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/60">
                    <span className="text-text-muted">Gender</span>
                    <span className="font-medium text-text-primary">
                      {patient.gender ? patient.gender.replace('_', ' ') : 'Not Specified'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/60">
                    <span className="text-text-muted">Date of Birth</span>
                    <span className="font-medium text-text-primary">
                      {patient.dateOfBirth
                        ? new Date(patient.dateOfBirth).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Not recorded'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/60">
                    <span className="text-text-muted">Primary Phone</span>
                    <span className="font-semibold text-primary">{patient.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/60">
                    <span className="text-text-muted">Email</span>
                    <span className="text-text-primary">{patient.email || 'None'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/60">
                    <span className="text-text-muted">Address</span>
                    <span className="text-text-primary text-right max-w-xs">
                      {patient.address ? `${patient.address}, ${patient.city || ''} ${patient.state || ''}` : 'No address specified'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-text-muted">Emergency Contact</span>
                    <span className="font-semibold text-text-primary">
                      {patient.emergencyContact || 'None provided'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                  Medical Profile & Allergies
                </h3>
                <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-4 text-xs">
                  <div>
                    <span className="font-semibold text-text-primary block mb-1 flex items-center gap-1.5 text-status-danger">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Known Allergies
                    </span>
                    <div className="p-2.5 rounded-lg bg-white border border-red-100 text-text-secondary">
                      {patient.allergies || 'No known drug or substance allergies recorded.'}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-text-primary block mb-1 flex items-center gap-1.5 text-primary">
                      <HeartPulse className="w-3.5 h-3.5" />
                      Past Medical / Skin History
                    </span>
                    <div className="p-2.5 rounded-lg bg-white border border-surface-border text-text-secondary">
                      {patient.medicalHistory || 'No significant prior medical conditions recorded.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                  Appointment History ({patient.appointments?.length || 0})
                </h3>
                {hasRole(['ADMIN', 'RECEPTIONIST']) && (
                  <Link href={`/appointments?patientId=${patient.id}`}>
                    <Button size="sm" variant="outline" leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}>
                      Book Appointment
                    </Button>
                  </Link>
                )}
              </div>

              {!patient.appointments || patient.appointments.length === 0 ? (
                <div className="p-8 text-center bg-surface rounded-xl border border-surface-border text-text-secondary text-xs">
                  No appointments booked yet for this patient.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Appointment Code</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time Slot</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.appointments.map((apt: any) => {
                      const statusConfig = STATUS_MAPPINGS[apt.status] || { label: apt.status, variant: 'default' };
                      return (
                        <TableRow key={apt.id}>
                          <TableCell className="font-mono font-bold text-primary">
                            {apt.appointmentCode}
                          </TableCell>
                          <TableCell className="font-medium">
                            Dr. {apt.doctor?.user?.firstName} {apt.doctor?.user?.lastName}
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(apt.appointmentDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {apt.startTime} - {apt.endTime}
                          </TableCell>
                          <TableCell className="text-xs">
                            {apt.type}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig.variant} size="sm" dot>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* 3. CLINICAL NOTES TAB (PHASE 3 LIVE DATA) */}
          {activeTab === 'clinical' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                Clinical Consultations & Findings ({consultations.length})
              </h3>

              {consultations.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-surface rounded-xl border border-surface-border text-text-secondary text-xs">
                  <Stethoscope className="w-10 h-10 text-primary/40 mx-auto" />
                  <p className="font-semibold text-text-primary">No consultation records recorded yet</p>
                  <p className="text-[11px]">When a doctor completes a consultation, clinical findings and diagnoses will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map((c) => (
                    <div
                      key={c.id}
                      className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/70 pb-3">
                        <div>
                          <span className="font-bold text-text-primary text-sm">
                            Consultation on {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          <span className="text-text-muted block text-[11px]">
                            Attending Doctor: <strong>Dr. {c.doctor?.user?.firstName} {c.doctor?.user?.lastName}</strong> ({c.doctor?.specialization})
                          </span>
                        </div>

                        {c.followUpDate && (
                          <Badge variant="accent" size="sm">
                            Follow-Up: {new Date(c.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="font-bold text-text-primary block mb-1">Chief Complaint</span>
                          <p className="p-2.5 rounded-lg bg-white border border-surface-border text-text-secondary">
                            {c.chiefComplaint}
                          </p>
                        </div>

                        {c.clinicalFindings && (
                          <div>
                            <span className="font-bold text-text-primary block mb-1">Clinical Findings</span>
                            <p className="p-2.5 rounded-lg bg-white border border-surface-border text-text-secondary">
                              {c.clinicalFindings}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Diagnoses */}
                      {c.diagnoses && c.diagnoses.length > 0 && (
                        <div>
                          <span className="font-bold text-text-primary block mb-1.5">Diagnoses</span>
                          <div className="flex flex-wrap gap-1.5">
                            {c.diagnoses.map((d: any) => (
                              <Badge key={d.id} variant="primary" size="sm">
                                {d.conditionName} {d.severity && `(${d.severity})`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Treatment Plan */}
                      {c.treatmentPlan && (
                        <div>
                          <span className="font-bold text-text-primary block mb-1">Treatment Plan</span>
                          <p className="p-2.5 rounded-lg bg-white border border-surface-border text-text-secondary">
                            {c.treatmentPlan}
                          </p>
                        </div>
                      )}

                      {/* Private Doctor Notes (Only visible to DOCTOR / ADMIN) */}
                      {isPrivilegedDoctor && c.doctorNotes && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                          <span className="font-bold flex items-center gap-1 text-amber-800">
                            <Lock className="w-3 h-3" /> Private Doctor Notes (Confidential)
                          </span>
                          <p>{c.doctorNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. PRESCRIPTIONS TAB (PHASE 3 LIVE DATA) */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                Medical Prescriptions ({prescriptions.length})
              </h3>

              {prescriptions.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-surface rounded-xl border border-surface-border text-text-secondary text-xs">
                  <Pill className="w-10 h-10 text-accent/50 mx-auto" />
                  <p className="font-semibold text-text-primary">No prescriptions issued yet</p>
                  <p className="text-[11px]">When a doctor prescribes medications, versioned prescriptions with PDF download links will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="p-5 rounded-2xl bg-surface border border-surface-border space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/70 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary text-sm">
                            {rx.prescriptionCode}
                          </span>
                          <Badge variant="primary" size="sm">
                            v{rx.version}
                          </Badge>
                          <Badge
                            variant={rx.status === 'ACTIVE' ? 'success' : 'default'}
                            size="sm"
                            dot
                          >
                            {rx.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/prescriptions/${rx.id}`}>
                            <Button size="sm" variant="outline" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                              View Details & Revisions
                            </Button>
                          </Link>
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/prescriptions/${rx.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="primary" leftIcon={<Download className="w-3.5 h-3.5" />}>
                              PDF Letterhead
                            </Button>
                          </a>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-text-muted text-[11px]">
                          Issued by <strong>Dr. {rx.doctor?.user?.firstName} {rx.doctor?.user?.lastName}</strong> on{' '}
                          {new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>

                        {rx.items && rx.items.length > 0 && (
                          <div className="pt-2">
                            <span className="font-semibold text-text-primary block mb-1">
                              Medications ({rx.items.length}):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {rx.items.map((it: any) => (
                                <span
                                  key={it.id}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-surface-border text-text-primary text-[11px] font-medium"
                                >
                                  {it.medicineName} ({it.dosage}) — {it.frequency}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. BILLING & INVOICES (PHASE 4 PLACEHOLDER) */}
          {activeTab === 'billing' && (
            <div className="p-12 text-center space-y-3 bg-surface rounded-xl border border-surface-border animate-in fade-in duration-150">
              <CreditCard className="w-12 h-12 text-status-success/50 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-text-primary">Invoices & Payment Receipts</h4>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  Service bills (Consultation, Laser, PRP, Peel), payments (Cash, UPI, Card), and payment receipts will be generated here in <strong>Phase 4 (Billing & Payments)</strong>.
                </p>
              </div>
              <Badge variant="accent" size="sm">Phase 4 Feature</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
