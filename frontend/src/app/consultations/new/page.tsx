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

const COMMON_DIAGNOSES = [
  'Acne Vulgaris',
  'Atopic Dermatitis / Eczema',
  'Melasma / Hyperpigmentation',
  'Alopecia Areata',
  'Tinea Corporis (Fungal)',
  'Seborrheic Dermatitis',
  'Psoriasis',
  'Rosacea',
  'Contact Dermatitis',
];

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
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [customDiagnosis, setCustomDiagnosis] = useState('');
  const [diagnosisSeverity, setDiagnosisSeverity] = useState('Moderate');
  const [followUpDate, setFollowUpDate] = useState('');

  // Prescription Items State
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemRow[]>([]);
  const [generalAdvice, setGeneralAdvice] = useState(
    'Drink 2-3L water daily. Apply broad-spectrum sunscreen 20 mins before sun exposure. Avoid scrubbing active lesions.',
  );

  // Medicine Autocomplete State
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [medicineSearchResults, setMedicineSearchResults] = useState<any[]>([]);
  const [isSearchingMeds, setIsSearchingMeds] = useState(false);

  // Success Modal State
  const [completedData, setCompletedData] = useState<{
    consultationId: string;
    prescriptionId?: string;
    prescriptionCode?: string;
  } | null>(null);

  // 1. Fetch Appointment & Patient Details
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

  const toggleDiagnosisTag = (diag: string) => {
    if (selectedDiagnoses.includes(diag)) {
      setSelectedDiagnoses(selectedDiagnoses.filter((d) => d !== diag));
    } else {
      setSelectedDiagnoses([...selectedDiagnoses, diag]);
    }
  };

  const handleAddCustomDiagnosis = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customDiagnosis.trim()) {
      e.preventDefault();
      if (!selectedDiagnoses.includes(customDiagnosis.trim())) {
        setSelectedDiagnoses([...selectedDiagnoses, customDiagnosis.trim()]);
      }
      setCustomDiagnosis('');
    }
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

    setIsSubmitting(true);
    try {
      // 1. Create Consultation
      const diagnosesPayload = selectedDiagnoses.map((name) => ({
        conditionName: name,
        severity: diagnosisSeverity,
      }));

      const consultationRes = await api.post('/consultations', {
        appointmentId: appointment.id,
        patientId: appointment.patient.id,
        chiefComplaint,
        symptoms,
        clinicalFindings,
        treatmentPlan,
        doctorNotes,
        followUpDate: followUpDate || undefined,
        diagnoses: diagnosesPayload,
      });

      const newConsultation = consultationRes.data.data;
      let newPrescription: any = null;

      // 2. If prescription items added, create Prescription
      if (prescriptionItems.length > 0) {
        const validItems = prescriptionItems.filter((it) => it.medicineName.trim().length > 0);
        if (validItems.length > 0) {
          const rxRes = await api.post('/prescriptions', {
            consultationId: newConsultation.id,
            patientId: appointment.patient.id,
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
      link.setAttribute(
        'download',
        `Prescription-${completedData.prescriptionCode || 'document'}.pdf`,
      );
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
      {/* Top Navigation */}
      <div>
        <Link
          href="/doctor/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Doctor Workspace
        </Link>
      </div>

      {/* Patient Header Banner */}
      <div className="bg-white rounded-2xl border border-surface-border p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary border border-primary-100 flex items-center justify-center font-bold text-lg">
            {pt.firstName[0]}
            {pt.lastName[0]}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-serif text-text-primary">
                {pt.firstName} {pt.lastName}
              </h2>
              <Badge variant="primary" size="sm" className="font-mono font-bold">
                {pt.patientCode}
              </Badge>
              <Badge variant="default" size="sm">
                {pt.gender ? pt.gender.replace('_', ' ') : 'N/A'}
              </Badge>
              {pt.bloodGroup && pt.bloodGroup !== 'UNKNOWN' && (
                <Badge variant="danger" size="sm">
                  {pt.bloodGroup.replace('_', ' ')}
                </Badge>
              )}
            </div>

            <p className="text-xs text-text-secondary mt-0.5">
              Appointment: <strong>{appointment.appointmentCode}</strong> • Doctor: <strong>Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}</strong>
            </p>
          </div>
        </div>

        {/* Known Allergies Warning */}
        {pt.allergies && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-status-danger flex items-center gap-2 max-w-md">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span><strong>Allergies Alert:</strong> {pt.allergies}</span>
          </div>
        )}
      </div>

      {/* Main Consultation & Prescription Form */}
      <form onSubmit={handleSaveConsultation} className="space-y-6">
        {/* 1. CLINICAL EXAMINATION & FINDINGS */}
        <Card accentTop>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              <CardTitle>Clinical Examination & Findings</CardTitle>
            </div>
            <Badge variant="primary" size="sm">Step 1: Clinical Notes</Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Chief Complaint / Presenting Problem"
                required
                placeholder="e.g. Severe acne breakouts on cheeks and chin"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
              />

              <Input
                label="Symptoms Description"
                placeholder="e.g. Itching, redness, painful cystic lesions"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Clinical Examination & Findings
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
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
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
                  placeholder="e.g. Start topical retinoid + oral antibiotic course; schedule chemical peel after 3 weeks..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                />
              </div>
            </div>

            {/* Structured Diagnoses Tags */}
            <div className="space-y-2 pt-2 border-t border-surface-border">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-text-primary">
                  Provisional & Clinical Diagnoses (Select or Add)
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-muted">Severity:</span>
                  <select
                    className="rounded border border-gray-300 py-1 px-2 text-xs bg-white focus:outline-none focus:border-primary"
                    value={diagnosisSeverity}
                    onChange={(e) => setDiagnosisSeverity(e.target.value)}
                  >
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {COMMON_DIAGNOSES.map((diag) => {
                  const isSelected = selectedDiagnoses.includes(diag);
                  return (
                    <button
                      key={diag}
                      type="button"
                      onClick={() => toggleDiagnosisTag(diag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface text-text-secondary border border-surface-border hover:border-primary'
                      }`}
                    >
                      {diag} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1 max-w-sm">
                <Input
                  placeholder="Type custom diagnosis and press Enter..."
                  value={customDiagnosis}
                  onChange={(e) => setCustomDiagnosis(e.target.value)}
                  onKeyDown={handleAddCustomDiagnosis}
                />
              </div>
            </div>

            {/* Private Doctor Notes Box (Privacy protected) */}
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

        {/* 2. PRESCRIPTION BUILDER */}
        <Card accentTop>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-accent" />
              <CardTitle>Electronic Prescription Builder</CardTitle>
            </div>
            <Badge variant="accent" size="sm">Step 2: Medication Routine</Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Quick Formulary Search Box */}
            <div className="relative max-w-lg">
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Quick Search Formulary / Medications
              </label>
              <Input
                placeholder="Search medicine (e.g. Tretinoin, Doxycycline, Suncros)..."
                value={medicineSearchQuery}
                onChange={(e) => setMedicineSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-text-muted" />}
              />
              {isSearchingMeds && (
                <div className="text-xs text-text-muted flex items-center gap-1.5 p-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Searching formulary...
                </div>
              )}

              {medicineSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-surface-border rounded-lg shadow-lg divide-y max-h-48 overflow-y-auto">
                  {medicineSearchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleAddMedicineFromSearch(m)}
                      className="w-full p-2.5 text-left hover:bg-primary-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-text-primary">{m.name}</span>
                        {m.genericName && (
                          <span className="text-text-muted ml-2">({m.genericName})</span>
                        )}
                      </div>
                      <span className="text-[11px] bg-primary-100 text-primary px-2 py-0.5 rounded font-medium">
                        + Add to Rx
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Medicine Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase">
                  Prescription Line Items ({prescriptionItems.length})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddManualMedicine}
                >
                  Add Custom Medicine
                </Button>
              </div>

              {prescriptionItems.length === 0 ? (
                <div className="p-8 text-center bg-surface rounded-xl border border-surface-border text-text-secondary text-xs">
                  No medicines added yet. Search formulary above or click &quot;Add Custom Medicine&quot;.
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-4">
                          <Input
                            placeholder="Medicine Name & Strength"
                            value={item.medicineName}
                            onChange={(e) => handleUpdateMedicineRow(idx, 'medicineName', e.target.value)}
                            required
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <select
                            className="w-full rounded-lg border border-gray-300 py-2 px-2 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
                            value={item.frequency}
                            onChange={(e) => handleUpdateMedicineRow(idx, 'frequency', e.target.value)}
                          >
                            {FREQUENCY_PRESETS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <select
                            className="w-full rounded-lg border border-gray-300 py-2 px-2 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
                            value={item.duration}
                            onChange={(e) => handleUpdateMedicineRow(idx, 'duration', e.target.value)}
                          >
                            {DURATION_PRESETS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <select
                            className="w-full rounded-lg border border-gray-300 py-2 px-2 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
                            value={item.route}
                            onChange={(e) => handleUpdateMedicineRow(idx, 'route', e.target.value)}
                          >
                            <option value="Topical">Topical</option>
                            <option value="Oral">Oral</option>
                            <option value="Scalp application">Scalp</option>
                            <option value="Intralesional">Intralesional</option>
                          </select>
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            className="p-1.5 text-text-muted hover:text-status-danger hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          placeholder="Dosage details (e.g. 0.05% / 100mg / 1 Tube)"
                          value={item.dosage}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'dosage', e.target.value)}
                        />
                        <Input
                          placeholder="Special patient instructions (e.g. Apply only on affected spots at night)"
                          value={item.instructions}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'instructions', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Advice & Follow-Up Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-surface-border">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  General Advice & Precautions
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
                  value={generalAdvice}
                  onChange={(e) => setGeneralAdvice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-primary">
                  Review Follow-Up Date
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFollowUpDays(7)}
                    className="px-2.5 py-1 rounded bg-surface border text-xs hover:border-primary"
                  >
                    +7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpDays(14)}
                    className="px-2.5 py-1 rounded bg-surface border text-xs hover:border-primary"
                  >
                    +14 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpDays(30)}
                    className="px-2.5 py-1 rounded bg-surface border text-xs hover:border-primary"
                  >
                    +30 Days
                  </button>
                </div>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/doctor/dashboard">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            leftIcon={<CheckCircle2 className="w-5 h-5" />}
            isLoading={isSubmitting}
          >
            Complete Consultation & Issue Prescription
          </Button>
        </div>
      </form>

      {/* Completion & PDF Modal */}
      <Modal
        isOpen={!!completedData}
        onClose={() => router.push('/doctor/dashboard')}
        title="Consultation Completed Successfully!"
        description="Clinical notes have been recorded and the appointment is marked Completed."
      >
        <div className="space-y-4 py-2">
          {completedData?.prescriptionCode ? (
            <div className="p-4 rounded-xl bg-primary-50/70 border border-primary-200 text-center space-y-2">
              <Badge variant="primary" size="md" className="font-mono font-bold text-sm">
                Rx: {completedData.prescriptionCode} (v1)
              </Badge>
              <p className="text-xs text-text-secondary">
                The prescription document has been generated with Ewa Derma clinic branding.
              </p>
              <Button
                type="button"
                variant="accent"
                className="w-full mt-2"
                leftIcon={<Download className="w-4 h-4" />}
                isLoading={isDownloadingPdf}
                onClick={handleDownloadPdf}
              >
                Download Prescription PDF
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-surface border border-surface-border text-center text-xs text-text-secondary">
              Consultation saved without medications.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              variant="primary"
              onClick={() => router.push('/doctor/dashboard')}
            >
              Return to Doctor Dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
