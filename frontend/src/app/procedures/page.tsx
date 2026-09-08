'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  Sparkles,
  Search,
  UserCheck,
  UserPlus,
  Stethoscope,
  Clock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Calendar,
  Layers,
  FileText,
  IndianRupee,
  X,
  Plus,
} from 'lucide-react';

export default function PatientProceduresPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { hasRole } = useAuth();

  // Step 1: Patient Search State
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [patients, setPatients] = useState<any[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  // Step 2: Form & Metadata State
  const [services, setServices] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [procedureNotes, setProcedureNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Confirmation State
  const [lastCreatedVisit, setLastCreatedVisit] = useState<any | null>(null);

  // 1. Fetch Metadata (Procedure Services & Doctors)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [servicesRes, doctorsRes] = await Promise.all([
          api.get('/appointments/procedure-services').catch(() => ({ data: { data: [] } })),
          api.get('/doctors').catch(() => ({ data: { data: [] } })),
        ]);

        const svcData = servicesRes?.data?.data ?? servicesRes?.data;
        const docData = doctorsRes?.data?.data ?? doctorsRes?.data;

        const svcList = Array.isArray(svcData) ? svcData : [];
        const docList = Array.isArray(docData) ? docData : [];

        setServices(svcList);
        setDoctors(docList);

        if (svcList.length > 0) setSelectedServiceId(svcList[0].id);
        if (docList.length > 0) setSelectedDoctorId(docList[0].id);
      } catch (err) {
        showToast('Notice: Could not load services or doctors list', 'error');
      } finally {
        setIsLoadingMeta(false);
      }
    };

    fetchMetadata();
  }, [showToast]);

  // 2. Fetch Patients based on debounced search
  const fetchPatients = useCallback(async () => {
    setIsSearchingPatients(true);
    try {
      const res = await api.get('/patients', {
        params: { search: debouncedSearch || undefined, limit: 10 },
      });
      const data = res?.data?.data?.items ?? res?.data?.data ?? res?.data;
      setPatients(Array.isArray(data) ? data : []);
    } catch {
      setPatients([]);
    } finally {
      setIsSearchingPatients(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // 3. Handle Submit
  const handleLogProcedure = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      showToast('Please search and select a patient first', 'error');
      return;
    }

    if (!selectedServiceId) {
      showToast('Please select a procedure service', 'error');
      return;
    }

    if (!selectedDoctorId) {
      showToast('Please select an assigned doctor', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/appointments/procedure-visit', {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        procedureServiceId: selectedServiceId,
        notes: procedureNotes.trim() || undefined,
      });

      const newVisit = res?.data?.data ?? res?.data;
      setLastCreatedVisit(newVisit);

      const patientName = `${selectedPatient.firstName} ${selectedPatient.lastName}`;
      const chosenService = services.find((s) => s.id === selectedServiceId)?.name || 'Procedure';

      showToast(
        `Procedure check-in complete: ${patientName} added to waiting queue for ${chosenService}!`,
        'success',
      );
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to log procedure visit';
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setProcedureNotes('');
    setLastCreatedVisit(null);
  };

  const selectedServiceObj = services.find((s) => s.id === selectedServiceId);
  const selectedDoctorObj = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Patient Procedures & Fast-Track Check-In
            </h1>
          </div>
          <p className="text-xs text-text-secondary pl-9">
            Quickly log clinical treatments (Laser, Chemical Peels, PRP, Facials) and place walk-in patients directly into the live doctor queue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/appointments">
            <Button variant="outline" size="sm" leftIcon={<Clock className="w-4 h-4" />}>
              Live Waiting Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION MODAL / CARD */}
      {lastCreatedVisit && (
        <Card className="border-emerald-300 bg-emerald-50/40 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-full bg-emerald-500 text-white mt-0.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                      {lastCreatedVisit.appointmentCode}
                    </span>
                    <Badge variant="success" size="sm">
                      CHECKED IN • READY IN QUEUE
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-text-primary">
                    {lastCreatedVisit.patient?.firstName} {lastCreatedVisit.patient?.lastName} ({lastCreatedVisit.patient?.patientCode})
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Procedure: <strong className="text-text-primary">{lastCreatedVisit.reason || lastCreatedVisit.procedureService?.name}</strong> • Assigned to: <strong className="text-text-primary">Dr. {lastCreatedVisit.doctor?.user?.firstName} {lastCreatedVisit.doctor?.user?.lastName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Link href="/appointments" className="flex-1 md:flex-initial">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    leftIcon={<Clock className="w-4 h-4" />}
                  >
                    View in Live Queue
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetForm}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Log Another Procedure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MAIN TWO-STEP FORM */}
      <form onSubmit={handleLogProcedure} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* STEP 1: PATIENT SEARCH & SELECTION (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 border-b border-surface-border">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-primary">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                      1
                    </span>
                    Find Registered Patient
                  </span>
                  {selectedPatient && (
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Switch Patient
                    </button>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 flex-1 flex flex-col space-y-4">
                {selectedPatient ? (
                  /* Selected Patient Card */
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                          {selectedPatient.firstName?.[0]}
                          {selectedPatient.lastName?.[0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-text-primary">
                            {selectedPatient.firstName} {selectedPatient.lastName}
                          </h4>
                          <span className="text-[11px] font-mono text-purple-800 font-semibold">
                            {selectedPatient.patientCode}
                          </span>
                        </div>
                      </div>
                      <Badge variant="success" size="sm">
                        Selected
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-purple-100 text-text-secondary">
                      <div>
                        <span className="text-[10px] text-text-muted block">Phone</span>
                        <span className="font-semibold text-text-primary">{selectedPatient.phone}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block">Gender / Blood</span>
                        <span className="font-semibold text-text-primary">
                          {selectedPatient.gender || 'N/A'} • {selectedPatient.bloodGroup?.replace('_', '+') || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Search Input & Results */
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="relative">
                      <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Search by name, phone (e.g. 9876543210), or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 text-xs"
                        autoFocus
                      />
                    </div>

                    {/* Search Results List */}
                    <div className="flex-1 overflow-y-auto max-h-80 border border-surface-border rounded-xl divide-y divide-surface-border">
                      {isSearchingPatients ? (
                        <div className="p-6 text-center text-xs text-text-muted">
                          Searching patient records...
                        </div>
                      ) : patients.length === 0 ? (
                        <div className="p-6 text-center space-y-2">
                          <p className="text-xs text-text-muted">No matching registered patients found.</p>
                          <Link href="/patients">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              leftIcon={<UserPlus className="w-3.5 h-3.5 text-primary" />}
                            >
                              Register New Patient First
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        patients.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPatient(p)}
                            className="p-3 hover:bg-purple-50/50 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-text-primary group-hover:text-primary">
                                  {p.firstName} {p.lastName}
                                </span>
                                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-medium">
                                  {p.patientCode}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-muted">
                                {p.phone} • {p.gender || 'Gender N/A'}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-primary group-hover:bg-primary group-hover:text-white"
                            >
                              Select
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* STEP 2: PROCEDURE, DOCTOR & SUBMIT (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="h-full flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-surface-border">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                      2
                    </span>
                    Procedure & Clinical Assignment
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  {/* Procedure Service Dropdown */}
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1.5">
                      Select Procedure / Treatment <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-surface-border bg-white px-3 text-xs font-medium focus:border-primary focus:outline-none"
                      required
                      disabled={isLoadingMeta}
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.category ? `(${s.category})` : ''} — ₹{Number(s.basePrice).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>

                    {selectedServiceObj && (
                      <div className="mt-2 flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-surface-border text-xs">
                        <span className="text-text-secondary">
                          Category: <strong className="text-text-primary">{selectedServiceObj.category || 'Clinical Procedure'}</strong>
                        </span>
                        <span className="font-bold text-primary flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5" />
                          {Number(selectedServiceObj.basePrice).toLocaleString('en-IN')} Standard Rate
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Doctor Dropdown */}
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1.5">
                      Assigned Treating Doctor <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-surface-border bg-white px-3 text-xs font-medium focus:border-primary focus:outline-none"
                      required
                      disabled={isLoadingMeta}
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.user?.firstName} {d.user?.lastName} ({d.specialization || 'Dermatologist'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Optional Treatment Notes */}
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1.5">
                      Procedure Notes / Special Instructions (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Session 3 of 6, patch test already completed, pre-peel wash given..."
                      value={procedureNotes}
                      onChange={(e) => setProcedureNotes(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-white p-3 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                </CardContent>
              </div>

              {/* Action Buttons */}
              <div className="p-6 pt-0 border-t border-surface-border flex items-center justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  size="md"
                  type="button"
                  onClick={handleResetForm}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!selectedPatient || !selectedServiceId || !selectedDoctorId || isSubmitting}
                  leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
                >
                  Log Procedure & Add to Queue
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
