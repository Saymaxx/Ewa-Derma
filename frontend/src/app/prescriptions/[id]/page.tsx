'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Pill,
  History,
  Download,
  Printer,
  Edit3,
  ArrowLeft,
  Calendar,
  User,
  Stethoscope,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
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

export default function PrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();

  const [prescription, setPrescription] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Revision Modal State
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionItems, setRevisionItems] = useState<PrescriptionItemRow[]>([]);
  const [revisionAdvice, setRevisionAdvice] = useState('');
  const [revisionFollowUp, setRevisionFollowUp] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const fetchPrescriptionAndVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rxRes, versionsRes] = await Promise.all([
        api.get(`/prescriptions/${id}`),
        api.get(`/prescriptions/${id}/versions`),
      ]);
      setPrescription(rxRes.data.data);
      setVersions(versionsRes.data.data || []);
    } catch {
      showToast('Failed to load prescription record', 'error');
      router.push('/patients');
    } finally {
      setIsLoading(false);
    }
  }, [id, router, showToast]);

  useEffect(() => {
    if (id) fetchPrescriptionAndVersions();
  }, [id, fetchPrescriptionAndVersions]);

  // Notifications State
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);

  const handleSendEmail = async () => {
    if (!prescription) return;
    setIsSendingEmail(true);
    try {
      const res = await api.post(`/notifications/send-prescription/${prescription.id}`, { channel: 'EMAIL' });
      showToast(res.data.message || 'Prescription sent via email', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to send email', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!prescription) return;
    setIsSendingWA(true);
    try {
      const res = await api.post(`/notifications/send-prescription/${prescription.id}`, { channel: 'WHATSAPP' });
      if (res.data.data?.status === 'FAILED') {
        showToast(res.data.data.errorLog || 'WhatsApp is not connected yet', 'error');
      } else {
        showToast(res.data.message || 'Prescription sent via WhatsApp', 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || err.response?.data?.message || 'WhatsApp is not connected yet', 'error');
    } finally {
      setIsSendingWA(false);
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!prescription) return;
    setIsDownloadingPdf(true);
    try {
      const response = await api.get(`/prescriptions/${prescription.id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Prescription-${prescription.prescriptionCode || prescription.id}.pdf`,
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

  const openRevisionModal = () => {
    if (!prescription) return;
    setRevisionItems(
      prescription.items.map((it: any) => ({
        medicineId: it.medicineId || undefined,
        medicineName: it.medicineName,
        dosage: it.dosage,
        frequency: it.frequency,
        duration: it.duration,
        route: it.route || 'Oral',
        quantity: it.quantity || 1,
        instructions: it.instructions || '',
      })),
    );
    setRevisionAdvice(prescription.generalAdvice || '');
    setRevisionFollowUp(
      prescription.followUpDate ? prescription.followUpDate.split('T')[0] : '',
    );
    setIsRevisionModalOpen(true);
  };

  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revisionItems.length === 0) {
      showToast('At least one medicine is required', 'warning');
      return;
    }

    setIsSubmittingRevision(true);
    try {
      const res = await api.post(`/prescriptions/${prescription.id}/version`, {
        items: revisionItems,
        generalAdvice: revisionAdvice,
        followUpDate: revisionFollowUp || undefined,
      });

      const newVersion = res.data.data;
      showToast(
        `Prescription ${newVersion.prescriptionCode} updated to version ${newVersion.version}`,
        'success',
        'Revision Created',
      );
      setIsRevisionModalOpen(false);
      router.push(`/prescriptions/${newVersion.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to create revision';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading prescription details...</p>
      </div>
    );
  }

  if (!prescription) return null;
  const isDoctorOrAdmin = hasRole(['ADMIN', 'DOCTOR']);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <div>
        <Link
          href={`/patients/${prescription.patientId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Patient Profile
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary border border-primary-100 flex items-center justify-center font-bold text-2xl shrink-0">
            <Pill className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold font-serif text-text-primary">
                Prescription {prescription.prescriptionCode}
              </h1>
              <Badge variant="primary" size="md" className="font-mono font-bold">
                v{prescription.version}
              </Badge>
              <Badge
                variant={prescription.status === 'ACTIVE' ? 'success' : 'default'}
                size="md"
                dot
              >
                {prescription.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 text-xs text-text-secondary pt-0.5">
              <span>
                Patient: <strong>{prescription.patient?.firstName} {prescription.patient?.lastName}</strong> ({prescription.patient?.patientCode})
              </span>
              <span>•</span>
              <span>
                Doctor: <strong>Dr. {prescription.doctor?.user?.firstName} {prescription.doctor?.user?.lastName}</strong>
              </span>
              <span>•</span>
              <span>
                Issued:{' '}
                {new Date(prescription.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            isLoading={isSendingEmail}
            leftIcon={<Mail className="w-4 h-4 text-primary" />}
          >
            Send Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendWhatsApp}
            isLoading={isSendingWA}
            leftIcon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
          >
            Send WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            isLoading={isDownloadingPdf}
            onClick={handleDownloadPdf}
          >
            PDF
          </Button>

          {isDoctorOrAdmin && prescription.status === 'ACTIVE' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Edit3 className="w-4 h-4" />}
              onClick={openRevisionModal}
            >
              Revise Prescription
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Details + Version History Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Medications Table & Advice (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card accentTop>
            <CardHeader>
              <CardTitle>Prescribed Medications ({prescription.items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-surface-border">
                {prescription.items?.map((item: any, idx: number) => (
                  <div key={item.id} className="p-4 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary text-sm">
                        {idx + 1}. {item.medicineName}
                      </span>
                      <Badge variant="default" size="sm">
                        {item.route}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-text-secondary pt-1">
                      <div>
                        <span className="text-text-muted block">Dosage</span>
                        <span className="font-medium text-text-primary">{item.dosage}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Frequency</span>
                        <span className="font-medium text-text-primary">{item.frequency}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Duration</span>
                        <span className="font-medium text-text-primary">{item.duration}</span>
                      </div>
                    </div>

                    {item.instructions && (
                      <p className="text-[11px] text-text-muted italic pt-1">
                        <strong>Instructions:</strong> {item.instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Advice & Follow-Up Card */}
          <Card>
            <CardHeader>
              <CardTitle>General Advice & Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-text-secondary">
                {prescription.generalAdvice || 'No special advice recorded.'}
              </div>

              {prescription.followUpDate && (
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Calendar className="w-4 h-4" />
                  Next Review Date:{' '}
                  {new Date(prescription.followUpDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Immutable Version History (1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-accent" />
                <CardTitle>Version History</CardTitle>
              </div>
              <span className="text-xs text-text-muted">{versions.length} Total</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-surface-border text-xs">
                {versions.map((ver) => {
                  const isCurrent = ver.id === prescription.id;
                  return (
                    <div
                      key={ver.id}
                      className={`p-3.5 space-y-1 transition-colors ${
                        isCurrent ? 'bg-primary-50/50 border-l-4 border-l-primary' : 'hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary">
                          Version {ver.version}
                        </span>
                        <Badge
                          variant={ver.status === 'ACTIVE' ? 'success' : 'default'}
                          size="sm"
                        >
                          {ver.status}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-text-muted">
                        Created on{' '}
                        {new Date(ver.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>

                      <div className="pt-1 flex items-center gap-2">
                        {!isCurrent ? (
                          <Link href={`/prescriptions/${ver.id}`}>
                            <span className="text-xs text-primary font-semibold hover:underline">
                              View this version
                            </span>
                          </Link>
                        ) : (
                          <span className="text-xs text-text-muted italic">Currently viewing</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-xl bg-surface border border-surface-border text-[11px] text-text-muted space-y-1">
            <p className="font-bold text-text-primary">Immutable Medical Records</p>
            <p>
              In compliance with clinical record regulations, prior prescription versions are permanently preserved and cannot be modified or deleted.
            </p>
          </div>
        </div>
      </div>

      {/* Revision Modal */}
      <Modal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        title={`Revise Prescription — ${prescription.prescriptionCode}`}
        description="Creates an incremented version (v2, v3). The previous version will remain fully intact in history."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRevision} className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-text-secondary uppercase">
                Medication List
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() =>
                  setRevisionItems([
                    ...revisionItems,
                    {
                      medicineName: '',
                      dosage: '',
                      frequency: '0-0-1 (Once at Night)',
                      duration: '14 days',
                      route: 'Topical',
                      quantity: 1,
                      instructions: '',
                    },
                  ])
                }
              >
                Add Row
              </Button>
            </div>

            {revisionItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-surface border border-surface-border space-y-2"
              >
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Input
                      placeholder="Medicine Name"
                      value={item.medicineName}
                      onChange={(e) => {
                        const updated = [...revisionItems];
                        updated[idx].medicineName = e.target.value;
                        setRevisionItems(updated);
                      }}
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      placeholder="Dosage"
                      value={item.dosage}
                      onChange={(e) => {
                        const updated = [...revisionItems];
                        updated[idx].dosage = e.target.value;
                        setRevisionItems(updated);
                      }}
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      placeholder="Frequency"
                      value={item.frequency}
                      onChange={(e) => {
                        const updated = [...revisionItems];
                        updated[idx].frequency = e.target.value;
                        setRevisionItems(updated);
                      }}
                      required
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setRevisionItems(revisionItems.filter((_, i) => i !== idx))
                      }
                      className="p-1 text-text-muted hover:text-status-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              General Advice / Revision Notes
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs bg-white text-text-primary focus:outline-none focus:border-primary"
              value={revisionAdvice}
              onChange={(e) => setRevisionAdvice(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRevisionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingRevision}
            >
              Save New Version (v{prescription.version + 1})
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
