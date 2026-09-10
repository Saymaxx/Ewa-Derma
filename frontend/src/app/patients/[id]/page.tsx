'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
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
  Lock,
  Plus,
  Loader2,
  HeartPulse,
  Edit2,
  Trash2,
  AlertTriangle,
  Camera,
  ZoomIn,
  Image as ImageIcon,
} from 'lucide-react';
import CreateInvoiceModal from '@/components/billing/CreateInvoiceModal';
import InvoiceDetailModal from '@/components/billing/InvoiceDetailModal';
import { ImageLightboxModal } from '@/components/ui/ImageLightboxModal';

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
  const [patientInvoices, setPatientInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [downloadingRxId, setDownloadingRxId] = useState<string | null>(null);

  // Lightbox Zoom Modal State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxBadge, setLightboxBadge] = useState<string | undefined>(undefined);

  // Edit Patient State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'NOT_SPECIFIED',
    bloodGroup: 'UNKNOWN',
    address: '',
    city: '',
    state: '',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
  });

  // Delete Patient State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deletingMediaKey, setDeletingMediaKey] = useState<string | null>(null);

  const handleDeleteConsultationImage = async (e: React.MouseEvent, consultationId: string, type: 'before' | 'after') => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete this ${type} clinical photo?`)) {
      return;
    }
    const key = `consultation-${consultationId}-${type}`;
    setDeletingMediaKey(key);
    try {
      await api.delete(`/consultations/${consultationId}/images/${type}`);
      showToast(`${type === 'before' ? 'Before' : 'After'} photo deleted successfully`, 'success', 'Photo Deleted');
      fetchPatientData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to delete photo', 'error');
    } finally {
      setDeletingMediaKey(null);
    }
  };

  const handleDeletePrescriptionScan = async (e: React.MouseEvent, prescriptionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this handwritten prescription scan slip?')) {
      return;
    }
    const key = `prescription-${prescriptionId}`;
    setDeletingMediaKey(key);
    try {
      await api.delete(`/prescriptions/${prescriptionId}/scan-image`);
      showToast('Prescription slip photo deleted successfully', 'success', 'Scan Deleted');
      fetchPatientData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to delete scan', 'error');
    } finally {
      setDeletingMediaKey(null);
    }
  };

  const handleDownloadRxPdf = async (rxId: string, rxCode?: string) => {
    setDownloadingRxId(rxId);
    try {
      const response = await api.get(`/prescriptions/${rxId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Prescription-${rxCode || rxId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Prescription PDF downloaded', 'success');
    } catch {
      showToast('Failed to download prescription PDF', 'error');
    } finally {
      setDownloadingRxId(null);
    }
  };

  const fetchPatientData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ptRes, consRes, rxRes, invRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/consultations/patient/${id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/prescriptions/patient/${id}`).catch(() => ({ data: { data: [] } })),
        api.get('/invoices', { params: { patientId: id } }).catch(() => ({ data: { data: [] } })),
      ]);

      const ptData = ptRes?.data?.data ?? ptRes?.data;
      const consData = consRes?.data?.data?.items ?? consRes?.data?.data ?? consRes?.data;
      const rxData = rxRes?.data?.data?.items ?? rxRes?.data?.data ?? rxRes?.data;
      const invData = invRes?.data?.data?.items ?? invRes?.data?.data ?? invRes?.data;

      setPatient(ptData);
      setConsultations(Array.isArray(consData) ? consData : []);
      setPrescriptions(Array.isArray(rxData) ? rxData : []);
      setPatientInvoices(Array.isArray(invData) ? invData : []);
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

  const safeConsultations = Array.isArray(consultations) ? consultations : [];
  const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];
  const safeInvoices = Array.isArray(patientInvoices) ? patientInvoices : [];

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading patient record...</p>
      </div>
    );
  }

  const openEditModal = () => {
    if (!patient) return;
    setEditFormData({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      phone: patient.phone || '',
      email: patient.email || '',
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
      gender: patient.gender || 'NOT_SPECIFIED',
      bloodGroup: patient.bloodGroup || 'UNKNOWN',
      address: patient.address || '',
      city: patient.city || '',
      state: patient.state || '',
      emergencyContact: patient.emergencyContact || '',
      medicalHistory: patient.medicalHistory || '',
      allergies: patient.allergies || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    if (!editFormData.firstName.trim() || !editFormData.lastName.trim() || !editFormData.phone.trim()) {
      showToast('First name, last name, and phone number are required', 'warning', 'Missing Fields');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const payload = {
        firstName: editFormData.firstName.trim(),
        lastName: editFormData.lastName.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim() ? editFormData.email.trim() : null,
        dateOfBirth: editFormData.dateOfBirth ? editFormData.dateOfBirth : null,
        gender: editFormData.gender,
        bloodGroup: editFormData.bloodGroup,
        address: editFormData.address.trim() ? editFormData.address.trim() : null,
        city: editFormData.city.trim() ? editFormData.city.trim() : null,
        state: editFormData.state.trim() ? editFormData.state.trim() : null,
        emergencyContact: editFormData.emergencyContact.trim() ? editFormData.emergencyContact.trim() : null,
        medicalHistory: editFormData.medicalHistory.trim() ? editFormData.medicalHistory.trim() : null,
        allergies: editFormData.allergies.trim() ? editFormData.allergies.trim() : null,
      };

      await api.patch(`/patients/${patient.id}`, payload);
      showToast(`Patient profile updated successfully.`, 'success', 'Profile Updated');
      setIsEditOpen(false);
      fetchPatientData();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Update Failed');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!patient) return;
    setIsDeleteSubmitting(true);
    try {
      await api.delete(`/patients/${patient.id}`);
      showToast(`Patient ${patient.patientCode} has been deactivated.`, 'success', 'Patient Deleted');
      setIsDeleteOpen(false);
      router.push('/patients');
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Delete Failed');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const isReceptionOrAdmin = hasRole(['ADMIN', 'RECEPTIONIST']);
  const isAdmin = hasRole('ADMIN');
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
      count: safeConsultations.length,
    },
    {
      id: 'prescriptions',
      label: 'Prescriptions',
      icon: <Pill className="w-4 h-4" />,
      count: safePrescriptions.length,
    },
    { id: 'billing', label: 'Billing & Invoices', icon: <CreditCard className="w-4 h-4" />, count: safeInvoices.length },
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isReceptionOrAdmin && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit2 className="w-3.5 h-3.5 text-blue-600" />}
                onClick={openEditModal}
              >
                Edit Details
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-status-danger hover:bg-status-danger/10"
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-status-danger" />}
                onClick={() => setIsDeleteOpen(true)}
              >
                Delete Patient
              </Button>
            )}

            {isReceptionOrAdmin && (
              <Link href={`/appointments?patientId=${patient.id}`}>
                <Button variant="primary" size="sm" leftIcon={<CalendarPlus className="w-4 h-4" />}>
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
                Clinical Consultations & Findings ({safeConsultations.length})
              </h3>

              {safeConsultations.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-surface rounded-xl border border-surface-border text-text-secondary text-xs">
                  <Stethoscope className="w-10 h-10 text-primary/40 mx-auto" />
                  <p className="font-semibold text-text-primary">No consultation records recorded yet</p>
                  <p className="text-[11px]">When a doctor completes a consultation, clinical findings and diagnoses will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {safeConsultations.map((c) => (
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

                      {/* Clinical Photography (Before & After Photos) */}
                      {(c.beforeImageUrl || c.afterImageUrl) && (
                        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
                          <div className="flex items-center gap-1.5 font-bold text-text-primary text-[11px] uppercase tracking-wider">
                            <Camera className="w-3.5 h-3.5 text-primary" />
                            <span>Clinical Photography & Progress Photos</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {c.beforeImageUrl && (
                              <div
                                onClick={() => {
                                  setLightboxImage(c.beforeImageUrl);
                                  setLightboxTitle(`Before Photo — ${new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
                                  setLightboxBadge('Before Treatment');
                                }}
                                className="cursor-pointer group relative rounded-lg border border-surface-border overflow-hidden bg-white p-1 hover:border-primary transition-all shadow-2xs"
                              >
                                <div className="relative h-44 w-full flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={c.beforeImageUrl} alt="Before Treatment" className="w-full h-full object-contain" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-[1px]">
                                    <ZoomIn className="w-4 h-4" />
                                    <span>Click to Zoom</span>
                                  </div>
                                  <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                    Before Treatment
                                  </span>
                                  {isPrivilegedDoctor && (
                                    <button
                                      type="button"
                                      title="Delete this Before photo"
                                      disabled={deletingMediaKey === `consultation-${c.id}-before`}
                                      onClick={(e) => handleDeleteConsultationImage(e, c.id, 'before')}
                                      className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-xs transition-all hover:scale-110"
                                    >
                                      {deletingMediaKey === `consultation-${c.id}-before` ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {c.afterImageUrl && (
                              <div
                                onClick={() => {
                                  setLightboxImage(c.afterImageUrl);
                                  setLightboxTitle(`After Photo — ${new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
                                  setLightboxBadge('After Treatment');
                                }}
                                className="cursor-pointer group relative rounded-lg border border-surface-border overflow-hidden bg-white p-1 hover:border-primary transition-all shadow-2xs"
                              >
                                <div className="relative h-44 w-full flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={c.afterImageUrl} alt="After Treatment" className="w-full h-full object-contain" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-[1px]">
                                    <ZoomIn className="w-4 h-4" />
                                    <span>Click to Zoom</span>
                                  </div>
                                  <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                    After Treatment
                                  </span>
                                  {isPrivilegedDoctor && (
                                    <button
                                      type="button"
                                      title="Delete this After photo"
                                      disabled={deletingMediaKey === `consultation-${c.id}-after`}
                                      onClick={(e) => handleDeleteConsultationImage(e, c.id, 'after')}
                                      className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-xs transition-all hover:scale-110"
                                    >
                                      {deletingMediaKey === `consultation-${c.id}-after` ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
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
                Medical Prescriptions ({safePrescriptions.length})
              </h3>

              {safePrescriptions.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-surface rounded-xl border border-surface-border text-text-secondary text-xs">
                  <Pill className="w-10 h-10 text-accent/50 mx-auto" />
                  <p className="font-semibold text-text-primary">No prescriptions issued yet</p>
                  <p className="text-[11px]">When a doctor prescribes medications, versioned prescriptions with PDF download links will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {safePrescriptions.map((rx) => (
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
                          {rx.rxType === 'HYBRID' || (rx.scanImageUrl && rx.items?.length > 0) ? (
                            <Badge variant="accent" size="sm">
                              ⚡ Hybrid (Digital + Scan)
                            </Badge>
                          ) : rx.scanImageUrl ? (
                            <Badge variant="accent" size="sm">
                              📷 Handwritten Scan
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm">
                              💻 Digital Rx
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/prescriptions/${rx.id}`}>
                            <Button size="sm" variant="outline" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                              View Details & Revisions
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="primary"
                            leftIcon={<Download className="w-3.5 h-3.5" />}
                            isLoading={downloadingRxId === rx.id}
                            onClick={() => handleDownloadRxPdf(rx.id, rx.prescriptionCode)}
                          >
                            PDF Letterhead
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-text-muted text-[11px]">
                          Issued by <strong>Dr. {rx.doctor?.user?.firstName} {rx.doctor?.user?.lastName}</strong> on{' '}
                          {new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>

                        {/* Handwritten Prescription Slip Thumbnail */}
                        {rx.scanImageUrl && (
                          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5 text-amber-700" />
                                <span>Attached Handwritten Prescription Pad Slip</span>
                              </span>
                              {isPrivilegedDoctor && (
                                <button
                                  type="button"
                                  title="Delete handwritten prescription scan"
                                  disabled={deletingMediaKey === `prescription-${rx.id}`}
                                  onClick={(e) => handleDeletePrescriptionScan(e, rx.id)}
                                  className="text-[11px] text-red-600 hover:text-red-800 flex items-center gap-1 font-semibold hover:underline"
                                >
                                  {deletingMediaKey === `prescription-${rx.id}` ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  <span>Remove Scan</span>
                                </button>
                              )}
                            </div>
                            <div
                              onClick={() => {
                                setLightboxImage(rx.scanImageUrl);
                                setLightboxTitle(`Handwritten Prescription #${rx.prescriptionCode}`);
                                setLightboxBadge('Prescription Pad Scan');
                              }}
                              className="cursor-pointer group relative max-w-xs rounded-lg border border-amber-300 overflow-hidden bg-white p-1 hover:border-accent transition-all shadow-2xs"
                            >
                              <div className="relative h-36 w-full flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={rx.scanImageUrl} alt="Handwritten Rx" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-[1px]">
                                  <ZoomIn className="w-4 h-4" />
                                  <span>Click to Zoom</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

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

          {/* 5. BILLING & INVOICES TAB (PHASE 4 LIVE DATA) */}
          {activeTab === 'billing' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                  Invoice & Payment History ({safeInvoices.length})
                </h3>
                {hasRole(['ADMIN', 'RECEPTIONIST']) && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsCreateInvoiceOpen(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Generate New Invoice
                  </Button>
                )}
              </div>

              {safeInvoices.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-surface rounded-xl border border-surface-border text-text-secondary text-xs">
                  <CreditCard className="w-10 h-10 text-primary/40 mx-auto" />
                  <p className="font-semibold text-text-primary">No invoices generated yet</p>
                  <p className="text-[11px]">Generate a new invoice for consultation fees, procedure services, or prescribed medicines.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Code</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total (₹)</TableHead>
                      <TableHead className="text-right">Paid (₹)</TableHead>
                      <TableHead className="text-right">Due (₹)</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-bold text-primary">
                          {inv.invoiceCode}
                        </TableCell>
                        <TableCell className="text-xs">
                          {inv.createdAt?.split('T')[0]}
                        </TableCell>
                        <TableCell className="text-right font-bold text-text-primary">
                          ₹{Number(inv.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">
                          ₹{Number(inv.paidAmount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          ₹{Number(inv.dueAmount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              inv.status === 'PAID'
                                ? 'success'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'accent'
                                : inv.status === 'CANCELLED' || inv.status === 'REFUNDED'
                                ? 'danger'
                                : 'info'
                            }
                            size="sm"
                            dot
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedInvoiceId(inv.id);
                              setIsDetailOpen(true);
                            }}
                          >
                            Inspect / Pay
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateInvoiceModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onSuccess={(createdInvoice) => {
          fetchPatientData();
          if (createdInvoice?.id) {
            setSelectedInvoiceId(createdInvoice.id);
            setIsDetailOpen(true);
          }
        }}
        initialPatientId={patient.id}
        initialPatientName={`${patient.firstName} ${patient.lastName}`}
      />

      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onRefresh={fetchPatientData}
      />

      {/* Edit Patient Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Patient Details — ${patient?.patientCode}`}
        description="Update personal demographic info, contact numbers, and medical profile."
        maxWidth="lg"
      >
        <form onSubmit={handleUpdatePatient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              placeholder="e.g. Aarav"
              value={editFormData.firstName}
              onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              placeholder="e.g. Gupta"
              value={editFormData.lastName}
              onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile Number"
              required
              placeholder="10-digit mobile"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="patient@example.com (Optional)"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              value={editFormData.dateOfBirth}
              onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Gender
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={editFormData.gender}
                onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="NOT_SPECIFIED">Not Specified</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Blood Group
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={editFormData.bloodGroup}
                onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="A_POSITIVE">A+</option>
                <option value="A_NEGATIVE">A-</option>
                <option value="B_POSITIVE">B+</option>
                <option value="B_NEGATIVE">B-</option>
                <option value="AB_POSITIVE">AB+</option>
                <option value="AB_NEGATIVE">AB-</option>
                <option value="O_POSITIVE">O+</option>
                <option value="O_NEGATIVE">O-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Address"
              placeholder="Apartment, Street, Sector"
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
            />
            <Input
              label="Emergency Contact"
              placeholder="Name & Phone (e.g. Spouse: 9876543211)"
              value={editFormData.emergencyContact}
              onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Known Allergies"
              placeholder="e.g. Sulfa drugs, Salicylic acid"
              value={editFormData.allergies}
              onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
            />
            <Input
              label="Medical History / Notes"
              placeholder="e.g. Hypertension, Acne breakouts"
              value={editFormData.medicalHistory}
              onChange={(e) => setEditFormData({ ...editFormData, medicalHistory: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isEditSubmitting}
            >
              Update Patient
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Patient Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Patient Deletion"
        description="Are you sure you want to deactivate and remove this patient record?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 space-y-1">
              <p className="font-semibold">
                Deactivating {patient?.firstName} {patient?.lastName} ({patient?.patientCode})
              </p>
              <p>
                This will soft-delete the patient from active directory lists while preserving past financial invoices and prescription audit history.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              isLoading={isDeleteSubmitting}
              onClick={handleDeletePatient}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* High-Resolution Clinical Photo & Scan Lightbox Viewer */}
      <ImageLightboxModal
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage}
        title={lightboxTitle}
        categoryBadge={lightboxBadge}
        subtitle={`Patient: ${patient?.firstName} ${patient?.lastName} (${patient?.patientCode})`}
      />
    </div>
  );
}

