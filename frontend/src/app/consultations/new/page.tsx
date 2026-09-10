'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ImageUploadDropzone } from '@/components/ui/ImageUploadDropzone';
import { ImageLightboxModal } from '@/components/ui/ImageLightboxModal';
import {
  Stethoscope,
  Pill,
  Plus,
  Trash2,
  Lock,
  Calendar,
  AlertTriangle,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Search,
  Loader2,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Eye,
  FileEdit,
  History,
} from 'lucide-react';

interface PrescriptionItemRow {
  medicineId?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: number;
  instructions: string;
}

const FREQUENCY_PRESETS = [
  '0-0-1 (Once at Night)',
  '1-0-1 (Twice Daily)',
  '1-0-0 (Once in Morning)',
  '1-1-1 (Three times Daily)',
  'SOS (As needed)',
];

const DURATION_PRESETS = ['7 days', '14 days', '21 days', '30 days', '60 days'];

export default function NewConsultationPage() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams?.get('appointmentId');
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [appointment, setAppointment] = useState<any>(null);
  const [isLoadingApt, setIsLoadingApt] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Consultation Form State
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Clinical Photography State (Before & After Photos)
  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);
  const [previousPhotos, setPreviousPhotos] = useState<
    Array<{ id: string; date: string; beforeUrl?: string | null; afterUrl?: string | null; chiefComplaint?: string }>
  >([]);

  // Prescription Mode & State (Digital vs. Handwritten Scan)
  const [rxMode, setRxMode] = useState<'digital' | 'handwritten'>('digital');
  const [handwrittenScanUrl, setHandwrittenScanUrl] = useState<string | null>(null);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemRow[]>([]);
  const [generalAdvice, setGeneralAdvice] = useState(
    'Drink 2-3L water daily. Apply broad-spectrum sunscreen 20 mins before sun exposure. Avoid scrubbing active lesions.'
  );

  // Medicine Autocomplete State
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [medicineSearchResults, setMedicineSearchResults] = useState<any[]>([]);
  const [isSearchingMeds, setIsSearchingMeds] = useState(false);

  // Lightbox Zoom Modal State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');

  // Success Modal State
  const [completedData, setCompletedData] = useState<{
    consultationId: string;
    prescriptionId?: string;
    prescriptionCode?: string;
  } | null>(null);

  // 1. Fetch Appointment & Patient Details + Previous History
  const fetchAppointmentDetails = useCallback(async () => {
    if (!appointmentId) return;
    setIsLoadingApt(true);
    try {
      const res = await api.get(`/appointments/${appointmentId}`);
      const apt = res.data.data;
      setAppointment(apt);
      if (apt.reason) {
        setChiefComplaint(apt.reason);
      }

      // Fetch patient's previous consultations to check for baseline photos
      if (apt?.patient?.id) {
        try {
          const pastRes = await api.get(`/consultations/patient/${apt.patient.id}`);
          const pastCons = pastRes?.data?.data?.items ?? pastRes?.data?.data ?? [];
          if (Array.isArray(pastCons)) {
            const extractedPhotos = pastCons
              .filter((c: any) => c.beforeImageUrl || c.afterImageUrl)
              .map((c: any) => ({
                id: c.id,
                date: new Date(c.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
                beforeUrl: c.beforeImageUrl,
                afterUrl: c.afterImageUrl,
                chiefComplaint: c.chiefComplaint,
              }));
            setPreviousPhotos(extractedPhotos);
          }
        } catch {
          // Ignore past photos fetch failure
        }
      }
    } catch {
      showToast('Failed to load appointment details', 'error');
      router.push('/doctor/dashboard');
    } finally {
      setIsLoadingApt(false);
    }
  }, [appointmentId, router, showToast]);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [fetchAppointmentDetails]);

  // 2. Debounced Medicine Formulary Search
  useEffect(() => {
    if (!medicineSearchQuery.trim()) {
      setMedicineSearchResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearchingMeds(true);
      try {
        const res = await api.get('/medicines', {
          params: { search: medicineSearchQuery, limit: 6 },
        });
        setMedicineSearchResults(res.data.data || []);
      } catch {
        // Ignore
      } finally {
        setIsSearchingMeds(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [medicineSearchQuery]);

  const handleAddMedicineFromSearch = (med: any) => {
    const isTopical = med.category?.name?.includes('Topical') || med.unit === 'Tube';
    const newRow: PrescriptionItemRow = {
      medicineId: med.id,
      medicineName: med.name,
      dosage: med.brand || 'Standard',
      frequency: isTopical ? '0-0-1 (Once at Night)' : '1-0-1 (Twice Daily)',
      duration: '30 days',
      route: isTopical ? 'Topical' : 'Oral',
      quantity: 1,
      instructions: isTopical ? 'Apply thin layer on lesions' : 'After food',
    };

    setPrescriptionItems((prev) => [...prev, newRow]);
    setMedicineSearchQuery('');
    setMedicineSearchResults([]);
  };

  const handleAddManualMedicine = () => {
    const newRow: PrescriptionItemRow = {
      medicineName: '',
      dosage: '',
      frequency: '0-0-1 (Once at Night)',
      duration: '14 days',
      route: 'Topical',
      quantity: 1,
      instructions: 'After food',
    };
    setPrescriptionItems((prev) => [...prev, newRow]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMedicineRow = (index: number, field: keyof PrescriptionItemRow, value: any) => {
    setPrescriptionItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Follow-up helper
  const setFollowUpDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFollowUpDate(date.toISOString().split('T')[0]);
  };

  // Submit Consultation & Prescription
  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      showToast('Chief complaint is required', 'warning');
      return;
    }

    if (rxMode === 'handwritten' && !handwrittenScanUrl && prescriptionItems.length === 0) {
      showToast('Please upload the handwritten prescription scan or switch to digital mode', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Consultation (Diagnoses field removed as requested)
      const consultationRes = await api.post('/consultations', {
        appointmentId: appointment.id,
        patientId: appointment.patient.id,
        chiefComplaint: chiefComplaint.trim(),
        symptoms: symptoms.trim() || undefined,
        clinicalFindings: clinicalFindings.trim() || undefined,
        treatmentPlan: treatmentPlan.trim() || undefined,
        doctorNotes: doctorNotes.trim() || undefined,
        beforeImageUrl: beforeImageUrl || undefined,
        afterImageUrl: afterImageUrl || undefined,
        followUpDate: followUpDate || undefined,
      });

      const newConsultation = consultationRes.data.data;
      let newPrescription: any = null;

      // 2. Create Prescription (Digital vs Handwritten Scan)
      if (rxMode === 'handwritten' && handwrittenScanUrl) {
        const rxRes = await api.post('/prescriptions', {
          consultationId: newConsultation.id,
          patientId: appointment.patient.id,
          rxType: 'HANDWRITTEN_SCAN',
          scanImageUrl: handwrittenScanUrl,
          generalAdvice,
          followUpDate: followUpDate || undefined,
          items: prescriptionItems.filter((it) => it.medicineName.trim().length > 0),
        });
        newPrescription = rxRes.data.data;
      } else if (prescriptionItems.length > 0) {
        const validItems = prescriptionItems.filter((it) => it.medicineName.trim().length > 0);
        if (validItems.length > 0) {
          const rxRes = await api.post('/prescriptions', {
            consultationId: newConsultation.id,
            patientId: appointment.patient.id,
            rxType: 'DIGITAL',
            generalAdvice,
            followUpDate: followUpDate || undefined,
            items: validItems,
          });
          newPrescription = rxRes.data.data;
        }
      }

      showToast('Consultation completed and clinical records saved', 'success', 'Consultation Saved');

      setCompletedData({
        consultationId: newConsultation.id,
        prescriptionId: newPrescription?.id,
        prescriptionCode: newPrescription?.prescriptionCode,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to save consultation';
      showToast(msg, 'error', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!completedData?.prescriptionId) return;
    setIsDownloadingPdf(true);
    try {
      const response = await api.get(`/prescriptions/${completedData.prescriptionId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Prescription-${completedData.prescriptionCode || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Prescription PDF downloaded successfully', 'success');
    } catch (err: any) {
      showToast('Failed to download prescription PDF', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoadingApt) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Preparing clinical consultation environment...</p>
      </div>
    );
  }

  if (!appointment) return null;
  const pt = appointment.patient;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Lightbox Zoom Viewer Modal */}
      <ImageLightboxModal
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage}
        title={lightboxTitle}
        subtitle={`Patient: ${pt.firstName} ${pt.lastName} (${pt.patientCode})`}
      />

      {/* Top Breadcrumb & Patient Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-2xl border border-surface-border shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/doctor/dashboard">
            <Button variant="ghost" size="sm" className="gap-1 text-text-secondary">
              <ArrowLeft className="w-4 h-4" />
              <span>OPD Desk</span>
            </Button>
          </Link>
          <div className="h-6 w-px bg-surface-border hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-text-primary">
                {pt.firstName} {pt.lastName}
              </h1>
              <Badge variant="primary" size="sm">
                {pt.patientCode}
              </Badge>
              <Badge variant="default" size="sm">
                {pt.gender} • {pt.bloodGroup}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Phone: {pt.phone} • Appt: #{appointment.appointmentCode} ({appointment.timeSlot})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pt.allergies && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Allergies: {pt.allergies}</span>
            </div>
          )}
          <Link href={`/patients/${pt.id}`} target="_blank">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              <span>Patient Profile</span>
            </Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSaveConsultation} className="space-y-6">
        {/* 1. CLINICAL EXAMINATION & PHOTOGRAPHY */}
        <Card accentTop>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              <CardTitle>Clinical Examination & Findings</CardTitle>
            </div>
            <Badge variant="primary" size="sm">
              Step 1: Clinical Notes & Photos
            </Badge>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Chief Complaint & Symptoms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Chief Complaint / Primary Concern <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary shadow-2xs"
                  placeholder="e.g. Severe cystic acne breakouts on cheeks and chin for 3 months..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Associated Symptoms & Patient History
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary shadow-2xs"
                  placeholder="e.g. Itching, erythema, aggravated by humid weather; tried OTC salicylic acid without relief..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>
            </div>

            {/* Clinical Findings & Treatment Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Clinical Examination & Derm Examination Findings
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary shadow-2xs"
                  placeholder="e.g. Multiple inflammatory papules, pustules, and closed comedones on bilateral cheeks..."
                  value={clinicalFindings}
                  onChange={(e) => setClinicalFindings(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Treatment Plan & Procedural Recommendations
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary shadow-2xs"
                  placeholder="e.g. Start topical retinoid + oral antibiotic course; schedule chemical peel after 3 weeks..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                />
              </div>
            </div>

            {/* CLINICAL PHOTOGRAPHY SECTION (BEFORE & AFTER PHOTOS) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Clinical Photography & Progress Photos
                  </h3>
                </div>
                <span className="text-[11px] text-primary font-medium bg-white px-2.5 py-0.5 rounded-full border border-primary/20">
                  Firebase Cloud Storage
                </span>
              </div>

              {/* Previous Baseline Reference Photos (if patient has past visits) */}
              {previousPhotos.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-primary/15 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary mb-2">
                    <History className="w-3.5 h-3.5 text-primary" />
                    <span>Previous Baseline Photos on Record ({previousPhotos.length} visit{previousPhotos.length > 1 ? 's' : ''})</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {previousPhotos.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex-shrink-0 flex items-center gap-2 bg-surface-raised p-2 rounded-lg border border-surface-border text-xs"
                      >
                        {item.beforeUrl && (
                          <div className="relative group cursor-pointer" onClick={() => { setLightboxImage(item.beforeUrl!); setLightboxTitle(`Previous Before Photo (${item.date})`); }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.beforeUrl} alt="Before" className="w-16 h-16 object-cover rounded border border-gray-200 group-hover:opacity-80 transition-opacity" />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5 rounded-b">Before</span>
                          </div>
                        )}
                        {item.afterUrl && (
                          <div className="relative group cursor-pointer" onClick={() => { setLightboxImage(item.afterUrl!); setLightboxTitle(`Previous After Photo (${item.date})`); }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.afterUrl} alt="After" className="w-16 h-16 object-cover rounded border border-gray-200 group-hover:opacity-80 transition-opacity" />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5 rounded-b">After</span>
                          </div>
                        )}
                        <div className="pl-1">
                          <div className="font-semibold text-text-primary text-[11px]">{item.date}</div>
                          <div className="text-[10px] text-text-muted max-w-[100px] truncate">{item.chiefComplaint || 'Consultation'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Dropzones for Today's Visit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploadDropzone
                  label="1. Before / Baseline Photo (Today's Condition)"
                  subLabel="Snap photo or upload baseline state before treatment"
                  value={beforeImageUrl}
                  onChange={setBeforeImageUrl}
                  folder="clinical-photos"
                />

                <ImageUploadDropzone
                  label="2. After / Post-Procedure Photo (Optional)"
                  subLabel="Snap photo after procedural session or follow-up outcome"
                  value={afterImageUrl}
                  onChange={setAfterImageUrl}
                  folder="clinical-photos"
                />
              </div>
            </div>

            {/* Private Doctor Notes Box */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <Lock className="w-3.5 h-3.5" />
                Private Doctor Clinical Notes (Confidential)
              </div>
              <p className="text-[11px] text-amber-700">
                These notes are restricted to doctors and administrators only. They are automatically stripped from any response to Reception or Inventory roles.
              </p>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-amber-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-accent"
                placeholder="e.g. Patient seems stressed; monitor closely for keloid tendency before procedural intervention..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. PRESCRIPTION BUILDER (DUAL MODE: DIGITAL OR HANDWRITTEN SCAN) */}
        <Card accentTop>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-accent" />
              <div>
                <CardTitle>Prescription & Medication Order</CardTitle>
                <p className="text-xs text-text-muted mt-0.5">Step 2: Issue digital routine or snap doctor handwritten pad</p>
              </div>
            </div>

            {/* Mode Segmented Toggle */}
            <div className="flex items-center p-1 bg-surface-raised rounded-xl border border-surface-border">
              <button
                type="button"
                onClick={() => setRxMode('digital')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rxMode === 'digital'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>💻 Digital Rx (Type)</span>
              </button>
              <button
                type="button"
                onClick={() => setRxMode('handwritten')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rxMode === 'handwritten'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>📷 Upload Handwritten Pad</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* MODE A: HANDWRITTEN PRESCRIPTION PAD UPLOAD */}
            {rxMode === 'handwritten' ? (
              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <Camera className="w-4 h-4 text-amber-700" />
                    <span>Upload Doctor&apos;s Handwritten Prescription Slip / Notes</span>
                  </div>
                  <Badge variant="accent" size="sm">
                    Handwritten Scan Mode
                  </Badge>
                </div>
                <p className="text-xs text-amber-800">
                  Snap a clear camera photo or upload the scanned page of the physical prescription pad. It will be attached directly to the patient&apos;s record, downloadable as high-res document, and accessible by the pharmacy desk.
                </p>

                <ImageUploadDropzone
                  label="Handwritten Prescription Slip Photo"
                  subLabel="Take photo of prescription pad or upload scanned document (WebP auto-compressed)"
                  value={handwrittenScanUrl}
                  onChange={setHandwrittenScanUrl}
                  folder="prescriptions"
                  required
                />
              </div>
            ) : (
              /* MODE B: DIGITAL PRESCRIPTION BUILDER */
              <div className="space-y-4">
                {/* Quick Formulary Search Box */}
                <div className="relative max-w-lg">
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Quick Search Formulary / Medications
                  </label>
                  <Input
                    placeholder="Search medicine (e.g. Tretinoin, Doxycycline, Suncros)..."
                    value={medicineSearchQuery}
                    onChange={(e) => setMedicineSearchQuery(e.target.value)}
                  />

                  {/* Search Autocomplete Dropdown */}
                  {isSearchingMeds && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-surface-border rounded-xl shadow-lg p-3 z-20 flex items-center justify-center gap-2 text-xs text-text-muted">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Searching dermatology formulary...</span>
                    </div>
                  )}

                  {!isSearchingMeds && medicineSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-surface-border rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-surface-border max-h-60 overflow-y-auto">
                      {medicineSearchResults.map((med) => (
                        <div
                          key={med.id}
                          onClick={() => handleAddMedicineFromSearch(med)}
                          className="p-2.5 hover:bg-surface-raised cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <div className="text-xs font-bold text-text-primary">{med.name}</div>
                            <div className="text-[11px] text-text-muted">
                              {med.genericName} • {med.brand || 'Standard'} • Unit: {med.unit}
                            </div>
                          </div>
                          <Badge variant="default" size="sm">
                            {med.category?.name || 'General'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prescription Line Items Table */}
                <div className="border border-surface-border rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-raised border-b border-surface-border font-semibold text-text-secondary">
                        <tr>
                          <th className="py-2.5 px-3">Medicine Name & Formulation</th>
                          <th className="py-2.5 px-3 w-28">Dosage</th>
                          <th className="py-2.5 px-3 w-44">Frequency / Timing</th>
                          <th className="py-2.5 px-3 w-28">Duration</th>
                          <th className="py-2.5 px-3 w-40">Instructions</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border bg-white">
                        {prescriptionItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-text-muted">
                              No medicines added yet. Use the formulary search above or click &quot;Add Manual Medicine&quot;.
                            </td>
                          </tr>
                        ) : (
                          prescriptionItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-surface/50 transition-colors">
                              <td className="p-2">
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-300 py-1 px-2 text-xs bg-white focus:outline-none focus:border-primary font-medium"
                                  placeholder="e.g. Minoxidil 5% Solution"
                                  value={item.medicineName}
                                  onChange={(e) => handleUpdateMedicineRow(idx, 'medicineName', e.target.value)}
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-300 py-1 px-2 text-xs bg-white focus:outline-none focus:border-primary"
                                  placeholder="e.g. 1ml"
                                  value={item.dosage}
                                  onChange={(e) => handleUpdateMedicineRow(idx, 'dosage', e.target.value)}
                                />
                              </td>
                              <td className="p-2">
                                <select
                                  className="w-full rounded border border-gray-300 py-1 px-2 text-xs bg-white focus:outline-none focus:border-primary"
                                  value={item.frequency}
                                  onChange={(e) => handleUpdateMedicineRow(idx, 'frequency', e.target.value)}
                                >
                                  {FREQUENCY_PRESETS.map((freq) => (
                                    <option key={freq} value={freq}>
                                      {freq}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2">
                                <select
                                  className="w-full rounded border border-gray-300 py-1 px-2 text-xs bg-white focus:outline-none focus:border-primary"
                                  value={item.duration}
                                  onChange={(e) => handleUpdateMedicineRow(idx, 'duration', e.target.value)}
                                >
                                  {DURATION_PRESETS.map((dur) => (
                                    <option key={dur} value={dur}>
                                      {dur}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-300 py-1 px-2 text-xs bg-white focus:outline-none focus:border-primary"
                                  placeholder="e.g. Apply only on affected scalp"
                                  value={item.instructions}
                                  onChange={(e) => handleUpdateMedicineRow(idx, 'instructions', e.target.value)}
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMedicineRow(idx)}
                                  className="p-1 text-text-muted hover:text-red-600 rounded transition-colors"
                                  title="Remove Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-2.5 bg-surface-raised border-t border-surface-border flex items-center justify-between">
                    <Button type="button" variant="ghost" size="sm" onClick={handleAddManualMedicine} className="gap-1 text-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Manual Medicine Row</span>
                    </Button>
                    <span className="text-[11px] text-text-muted">{prescriptionItems.length} item{prescriptionItems.length !== 1 ? 's' : ''} in routine</span>
                  </div>
                </div>
              </div>
            )}

            {/* General Lifestyle & Skincare Instructions */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                General Care Advice & Skincare Instructions
              </label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary shadow-2xs"
                placeholder="e.g. Use broad-spectrum sunscreen SPF 50+, avoid spicy foods, maintain hydration..."
                value={generalAdvice}
                onChange={(e) => setGeneralAdvice(e.target.value)}
              />
            </div>

            {/* Follow-up Scheduler Helper */}
            <div className="p-3.5 rounded-xl bg-surface-raised border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Recommended Follow-up Visit Date</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFollowUpDays(7)}
                    className="px-2 py-1 bg-white border border-gray-300 hover:border-primary rounded text-text-secondary font-medium transition-colors"
                  >
                    +1 Wk
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpDays(14)}
                    className="px-2 py-1 bg-white border border-gray-300 hover:border-primary rounded text-text-secondary font-medium transition-colors"
                  >
                    +2 Wks
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpDays(30)}
                    className="px-2 py-1 bg-white border border-gray-300 hover:border-primary rounded text-text-secondary font-medium transition-colors"
                  >
                    +1 Mo
                  </button>
                </div>
                <input
                  type="date"
                  className="rounded border border-gray-300 py-1 px-2 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/doctor/dashboard">
            <Button type="button" variant="secondary" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="gap-2 shadow-md">
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete & Save Consultation</span>
          </Button>
        </div>
      </form>

      {/* Success Completion Dialog */}
      <Modal isOpen={Boolean(completedData)} onClose={() => router.push('/doctor/dashboard')} title="Consultation Completed Successfully">
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-text-primary">Clinical Visit Finalized</h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              Consultation notes, clinical photography, and prescription records have been securely stored in patient history.
            </p>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-surface-border text-xs text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-muted">Patient:</span>
              <span className="font-bold text-text-primary">
                {pt.firstName} {pt.lastName} ({pt.patientCode})
              </span>
            </div>
            {completedData?.prescriptionCode && (
              <div className="flex justify-between">
                <span className="text-text-muted">Prescription Code:</span>
                <span className="font-mono font-bold text-accent">{completedData.prescriptionCode}</span>
              </div>
            )}
            {beforeImageUrl && (
              <div className="flex justify-between">
                <span className="text-text-muted">Before Photo:</span>
                <span className="text-emerald-600 font-semibold">Attached 📷</span>
              </div>
            )}
            {afterImageUrl && (
              <div className="flex justify-between">
                <span className="text-text-muted">After Photo:</span>
                <span className="text-emerald-600 font-semibold">Attached 📷</span>
              </div>
            )}
            {rxMode === 'handwritten' && handwrittenScanUrl && (
              <div className="flex justify-between">
                <span className="text-text-muted">Handwritten Pad:</span>
                <span className="text-accent font-semibold">Attached 📷</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            {completedData?.prescriptionId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadPdf}
                isLoading={isDownloadingPdf}
                className="w-full sm:w-auto gap-1.5"
              >
                <Download className="w-4 h-4 text-primary" />
                <span>Download Rx PDF</span>
              </Button>
            )}

            <Link href={`/patients/${pt.id}`} className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full sm:w-auto gap-1.5">
                <FileText className="w-4 h-4" />
                <span>View Patient Profile</span>
              </Button>
            </Link>

            <Link href="/doctor/dashboard" className="w-full sm:w-auto">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                Back to OPD Queue
              </Button>
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
