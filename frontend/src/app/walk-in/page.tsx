'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  UserCheck,
  Search,
  UserPlus,
  Sparkles,
  Clock,
  CheckCircle2,
  Calendar,
  Stethoscope,
  Phone,
  FileText,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

export default function WalkInVisitPage() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Search & Patient State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  // Quick Register State
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickRegForm, setQuickRegForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: 'NOT_SPECIFIED',
  });
  const [isQuickRegistering, setIsQuickRegistering] = useState(false);

  // Services State (Unfiltered - Consultations + All Procedures)
  const [services, setServices] = useState<any[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  // Doctors State
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  // Visit Details State
  const [visitNotes, setVisitNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedVisit, setLastCreatedVisit] = useState<any | null>(null);

  // 1. Fetch All Active Services (Unfiltered)
  const fetchServices = useCallback(async () => {
    setIsLoadingServices(true);
    try {
      const res = await api.get('/services');
      const allServices = (res.data?.data || []).filter((s: any) => s.isActive);
      setServices(allServices);

      const cats = Array.from(
        new Set(
          allServices
            .map((s: any) => s.category)
            .filter((c: any) => typeof c === 'string' && c.trim() !== '')
        )
      ) as string[];
      setServiceCategories(cats);

      // Default selection to consultation if available, or first service
      if (allServices.length > 0 && !selectedServiceId) {
        const consult = allServices.find(
          (s: any) =>
            s.category?.toLowerCase() === 'consultation' ||
            s.name.toLowerCase().includes('consultation')
        );
        setSelectedServiceId(consult ? consult.id : allServices[0].id);
      }
    } catch {
      showToast('Failed to load clinic services catalog', 'error');
    } finally {
      setIsLoadingServices(false);
    }
  }, [selectedServiceId, showToast]);

  // 2. Fetch Active Doctors
  const fetchDoctors = useCallback(async () => {
    setIsLoadingDoctors(true);
    try {
      const res = await api.get('/doctors');
      const docs = res.data?.data || [];
      const activeDocs = docs.filter((d: any) => d.isActive);
      setDoctors(activeDocs);
      if (activeDocs.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(activeDocs[0].id);
      }
    } catch {
      showToast('Failed to load doctor rosters', 'error');
    } finally {
      setIsLoadingDoctors(false);
    }
  }, [selectedDoctorId, showToast]);

  useEffect(() => {
    fetchServices();
    fetchDoctors();
  }, [fetchServices, fetchDoctors]);

  // 3. Debounced Patient Search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/patients?search=${encodeURIComponent(trimmed)}&limit=6`);
        const items = res?.data?.data?.items ?? res?.data?.items ?? [];
        setSearchResults(items);
      } catch {
        // search error silent
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 4. Quick Patient Registration Handler
  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRegForm.firstName.trim() || !quickRegForm.lastName.trim() || !quickRegForm.phone.trim()) {
      showToast('Please fill in First Name, Last Name, and Mobile Number', 'warning');
      return;
    }

    setIsQuickRegistering(true);
    try {
      const payload: any = {
        firstName: quickRegForm.firstName.trim(),
        lastName: quickRegForm.lastName.trim(),
        phone: quickRegForm.phone.trim(),
      };
      if (quickRegForm.gender && quickRegForm.gender !== 'NOT_SPECIFIED') {
        payload.gender = quickRegForm.gender;
      }

      const res = await api.post('/patients', payload);
      const newPatient = res?.data?.data ?? res?.data;

      showToast(
        `Patient ${newPatient.firstName} ${newPatient.lastName} (${newPatient.patientCode}) registered successfully!`,
        'success',
        'Quick Registration Done'
      );

      setSelectedPatient(newPatient);
      setShowQuickRegister(false);
      setSearchQuery('');
      setSearchResults([]);
      setQuickRegForm({ firstName: '', lastName: '', phone: '', gender: 'NOT_SPECIFIED' });
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to quick-register patient. Please check phone format.';
      showToast(errorMsg, 'error');
    } finally {
      setIsQuickRegistering(false);
    }
  };

  // 5. Submit Walk-In Check-In Visit
  const handleWalkInCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      showToast('Please search and select a patient or use Quick Register', 'warning');
      return;
    }

    if (!selectedServiceId) {
      showToast('Please select the visit reason / service', 'warning');
      return;
    }

    if (!selectedDoctorId) {
      showToast('Please select the attending doctor', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/appointments/walk-in-visit', {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        serviceId: selectedServiceId,
        notes: visitNotes.trim() || undefined,
      });

      const newVisit = res?.data?.data ?? res?.data;
      setLastCreatedVisit(newVisit);

      const patientName = `${selectedPatient.firstName} ${selectedPatient.lastName}`;
      const chosenService = services.find((s) => s.id === selectedServiceId)?.name || 'Visit';

      showToast(
        `Walk-in check-in complete: ${patientName} placed into Live Queue for ${chosenService}!`,
        'success',
        'Patient Checked In'
      );
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to check in walk-in visit';
      showToast(errorMsg, 'error', 'Check-In Conflict / Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setVisitNotes('');
    setLastCreatedVisit(null);
    setShowQuickRegister(false);
  };

  // Filtered Services for UI Selection
  const filteredServices = services.filter((s) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'CONSULTATION' &&
        (s.category?.toLowerCase() === 'consultation' || s.name.toLowerCase().includes('consultation'))) ||
      s.category?.toUpperCase() === selectedCategory.toUpperCase();

    const matchesSearch =
      !serviceSearch.trim() ||
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.category?.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(serviceSearch.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const selectedServiceObj = services.find((s) => s.id === selectedServiceId);
  const selectedDoctorObj = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-primary-100 text-primary-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Walk-In Immediate Check-In
            </h1>
          </div>
          <p className="text-xs text-text-secondary pl-9">
            Front-door check-in for physical walk-ins (both Consultations and Clinical Procedures) with instant patient quick-registration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/appointments">
            <Button variant="outline" size="sm" leftIcon={<Clock className="w-4 h-4 text-primary" />}>
              Live Waiting Queue
            </Button>
          </Link>
          <Link href="/procedures">
            <Button variant="ghost" size="sm" leftIcon={<Sparkles className="w-4 h-4 text-purple-600" />}>
              Procedures Only
            </Button>
          </Link>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION BANNER */}
      {lastCreatedVisit && (
        <Card className="border-emerald-300 bg-emerald-50/50 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-full bg-emerald-500 text-white mt-0.5 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded">
                      {lastCreatedVisit.appointmentCode}
                    </span>
                    <Badge variant="success" size="sm">
                      CHECKED IN • IN LIVE WAITING QUEUE
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-text-primary">
                    {lastCreatedVisit.patient?.firstName} {lastCreatedVisit.patient?.lastName} ({lastCreatedVisit.patient?.patientCode})
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Reason / Service:{' '}
                    <strong className="text-text-primary">
                      {lastCreatedVisit.reason || lastCreatedVisit.procedureService?.name}
                    </strong>{' '}
                    • Assigned to:{' '}
                    <strong className="text-text-primary">
                      Dr. {lastCreatedVisit.doctor?.user?.firstName} {lastCreatedVisit.doctor?.user?.lastName}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <Link href="/appointments" className="flex-1 md:flex-initial">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
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
                  Next Walk-In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MAIN CHECK-IN WORKFLOW */}
      <form onSubmit={handleWalkInCheckIn} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* STEP 1: PATIENT FIND OR QUICK REGISTER (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 border-b border-surface-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <CardTitle className="text-sm font-bold">Patient Identification</CardTitle>
                  </div>
                  {!selectedPatient && !showQuickRegister && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:bg-primary-50 text-xs px-2"
                      onClick={() => setShowQuickRegister(true)}
                      leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                    >
                      Quick Register
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                {/* Mode A: Selected Patient Display */}
                {selectedPatient ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              {selectedPatient.patientCode}
                            </span>
                            <Badge variant="success" size="sm">
                              Patient Selected
                            </Badge>
                          </div>
                          <h4 className="text-base font-bold text-text-primary">
                            {selectedPatient.firstName} {selectedPatient.lastName}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mt-1">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-text-muted" />
                              {selectedPatient.phone}
                            </span>
                            {selectedPatient.gender && selectedPatient.gender !== 'NOT_SPECIFIED' && (
                              <span>• Gender: {selectedPatient.gender}</span>
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPatient(null)}
                          className="text-xs text-text-muted hover:text-status-danger"
                        >
                          Change
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-text-muted flex items-center gap-2 p-2 rounded-lg bg-surface/60 border border-surface-border">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Patient record verified and ready for instant check-in.</span>
                    </div>
                  </div>
                ) : showQuickRegister ? (
                  /* Mode B: Compact Quick Register Form */
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <UserPlus className="w-4 h-4" />
                        <span>Quick Register New Walk-In</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs text-text-muted"
                        onClick={() => setShowQuickRegister(false)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <Input
                        label="First Name *"
                        placeholder="e.g. Aarav"
                        value={quickRegForm.firstName}
                        onChange={(e) => setQuickRegForm({ ...quickRegForm, firstName: e.target.value })}
                        required
                      />
                      <Input
                        label="Last Name *"
                        placeholder="e.g. Sharma"
                        value={quickRegForm.lastName}
                        onChange={(e) => setQuickRegForm({ ...quickRegForm, lastName: e.target.value })}
                        required
                      />
                    </div>

                    <Input
                      label="Mobile Number *"
                      placeholder="10-digit mobile number"
                      value={quickRegForm.phone}
                      onChange={(e) => setQuickRegForm({ ...quickRegForm, phone: e.target.value })}
                      required
                    />

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                        Gender (Optional)
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
                        value={quickRegForm.gender}
                        onChange={(e) => setQuickRegForm({ ...quickRegForm, gender: e.target.value })}
                      >
                        <option value="NOT_SPECIFIED">Not Specified</option>
                        <option value="FEMALE">Female</option>
                        <option value="MALE">Male</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQuickRegister(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleQuickRegister}
                        isLoading={isQuickRegistering}
                        leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                      >
                        Register & Select
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Mode C: Debounced Search Existing Patient */
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-text-primary">
                        Search Registered Patient
                      </label>
                      <Input
                        placeholder="Type patient name, phone, or PAT-xxxx..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="w-4 h-4 text-text-muted" />}
                      />
                    </div>

                    {isSearching ? (
                      <div className="p-6 text-center text-text-muted text-xs flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Searching clinic database...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {searchResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPatient(p)}
                            className="p-3 rounded-lg border border-surface-border bg-white hover:bg-primary-50/50 hover:border-primary-300 transition-all cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-text-primary">
                                {p.firstName} {p.lastName}
                              </div>
                              <div className="text-[11px] text-text-secondary flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-primary font-semibold">{p.patientCode}</span>
                                <span>• {p.phone}</span>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              Select
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : searchQuery.trim().length >= 2 ? (
                      <div className="p-5 text-center bg-surface/50 rounded-xl border border-dashed border-surface-border space-y-3">
                        <div className="text-xs text-text-secondary">
                          No patient record found for <strong className="text-text-primary">&quot;{searchQuery}&quot;</strong>
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setShowQuickRegister(true);
                            // Pre-fill phone if input looks numeric
                            if (/^\d+$/.test(searchQuery.trim())) {
                              setQuickRegForm((prev) => ({ ...prev, phone: searchQuery.trim() }));
                            } else {
                              const parts = searchQuery.trim().split(' ');
                              setQuickRegForm((prev) => ({
                                ...prev,
                                firstName: parts[0] || '',
                                lastName: parts.slice(1).join(' ') || '',
                              }));
                            }
                          }}
                          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                        >
                          Quick Register Now
                        </Button>
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-surface-border">
                        <UserCheck className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-text-secondary">
                          Search by name or phone, or click <strong>Quick Register</strong> for brand new walk-ins.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1 Footer Guidance */}
                <div className="pt-3 border-t border-surface-border text-[11px] text-text-muted">
                  Quick-registration takes 5 seconds; complete medical history can be filled later during consultation.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* STEP 2 & 3: SERVICE REASON & DOCTOR SELECTION (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader className="pb-3 border-b border-surface-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <CardTitle className="text-sm font-bold">Visit Reason & Service Catalog</CardTitle>
                  </div>
                  <span className="text-xs text-text-muted">{filteredServices.length} Services Available</span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Search & Category Tabs */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('ALL')}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        selectedCategory === 'ALL'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface text-text-secondary hover:bg-surface-border'
                      }`}
                    >
                      All Services
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('CONSULTATION')}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        selectedCategory === 'CONSULTATION'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-surface text-text-secondary hover:bg-surface-border'
                      }`}
                    >
                      Consultations
                    </button>
                    {serviceCategories
                      .filter((c) => c.toLowerCase() !== 'consultation')
                      .map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            selectedCategory.toUpperCase() === cat.toUpperCase()
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-surface text-text-secondary hover:bg-surface-border'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                  </div>

                  <Input
                    placeholder="Filter service by name (e.g. Skin Consultation, Laser, Glow Peel)..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    leftIcon={<Search className="w-3.5 h-3.5 text-text-muted" />}
                  />
                </div>

                {/* Services List / Radio Selection */}
                {isLoadingServices ? (
                  <div className="p-8 text-center text-xs text-text-muted">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading services catalog...
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-muted bg-surface/40 rounded-xl">
                    No services found matching category or filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {filteredServices.map((service) => {
                      const isSelected = selectedServiceId === service.id;
                      const isConsult =
                        service.category?.toLowerCase() === 'consultation' ||
                        service.name.toLowerCase().includes('consultation');

                      return (
                        <div
                          key={service.id}
                          onClick={() => setSelectedServiceId(service.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-primary bg-primary-50/60 ring-2 ring-primary/20 shadow-xs'
                              : 'border-surface-border bg-white hover:border-gray-300 hover:bg-surface/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-text-primary block line-clamp-1">
                                {service.name}
                              </span>
                              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                                {service.category || 'General'}
                              </span>
                            </div>
                            <Badge variant={isConsult ? 'info' : 'accent'} size="sm">
                              {isConsult ? 'Consult' : 'Procedure'}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-xs mt-2 pt-1.5 border-t border-surface-border/60">
                            <span className="text-text-secondary text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-text-muted" />
                              {service.durationMinutes || 30} mins
                            </span>
                            <span className="font-bold text-text-primary">
                              ₹{Number(service.basePrice).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* STEP 3: DOCTOR ASSIGNMENT & NOTES */}
            <Card>
              <CardHeader className="pb-3 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <CardTitle className="text-sm font-bold">Attending Doctor & Notes</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Doctor Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Attending Doctor <span className="text-status-danger">*</span>
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      required
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.user?.firstName} {d.user?.lastName} ({d.specialization}) — Room {d.roomNumber || '1'}
                        </option>
                      ))}
                    </select>

                    {selectedDoctorObj && (
                      <p className="text-[11px] text-text-secondary mt-1">
                        Days: <strong>{selectedDoctorObj.workingDays || 'Mon-Sun'}</strong> • Fee: ₹{selectedDoctorObj.consultationFee}
                      </p>
                    )}
                  </div>

                  {/* Visit Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Visit Notes / Chief Complaint (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
                      placeholder="e.g. Acute rash on cheek, Wants chemical peel"
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Summary & Submit Action */}
                <div className="p-3.5 rounded-xl bg-surface/70 border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                  <div className="text-xs text-text-secondary space-y-0.5 text-center sm:text-left">
                    <div>
                      Checking in:{' '}
                      <strong className="text-text-primary">
                        {selectedPatient
                          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                          : 'No patient selected'}
                      </strong>
                    </div>
                    <div>
                      For:{' '}
                      <strong className="text-text-primary">
                        {selectedServiceObj ? selectedServiceObj.name : 'Select a service'}
                      </strong>{' '}
                      with{' '}
                      <strong className="text-text-primary">
                        {selectedDoctorObj
                          ? `Dr. ${selectedDoctorObj.user?.lastName || selectedDoctorObj.user?.firstName}`
                          : 'Doctor'}
                      </strong>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    disabled={!selectedPatient || !selectedServiceId || !selectedDoctorId}
                    className="w-full sm:w-auto px-6 font-bold shadow-md"
                    leftIcon={<UserCheck className="w-4 h-4" />}
                  >
                    Check In Walk-In Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
