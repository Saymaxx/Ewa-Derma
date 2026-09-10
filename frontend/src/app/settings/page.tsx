'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Calendar,
  Percent,
  FileText,
  UploadCloud,
  Save,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  ImageIcon,
  HardDrive,
  Trash2,
  RefreshCw,
  Sparkles,
  Database,
  AlertTriangle,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ClinicSettingsPage() {
  const { user, hasRole, updateClinic, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    clinicName: '',
    address: '',
    contactNumber: '',
    email: '',
    gstNumber: '',
    taxRate: 18,
    openingTime: '10:00',
    closingTime: '19:00',
    operatingDays: 'Mon,Tue,Wed,Thu,Fri,Sat',
    slotDuration: 30,
    logoUrl: '/ewa-derma-logo.jpg',
  });

  const [selectedDays, setSelectedDays] = useState<string[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ]);

  // Storage Stats State
  const [storageStats, setStorageStats] = useState<any>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const [cleanupMonths, setCleanupMonths] = useState(24);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const fetchStorageStats = async () => {
    setIsLoadingStorage(true);
    try {
      const res = await api.get('/admin/storage-stats');
      setStorageStats(res.data?.data || res.data);
    } catch {
      // ignore
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const handleBulkCleanup = async () => {
    const monthsText = cleanupMonths === 12 ? '1 year (12 months)' : cleanupMonths === 24 ? '2 years (24 months)' : `${cleanupMonths} months`;
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to permanently delete all clinical photos & prescription scans older than ${monthsText}?\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const res = await api.post('/admin/storage-cleanup', { olderThanMonths: cleanupMonths });
      const data = res.data?.data || res.data;
      showToast(data.message || `Cleaned up ${data.totalCleared} photos`, 'success', 'Storage Cleaned Up');
      fetchStorageStats();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to cleanup storage', 'error');
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Load clinic settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/admin/settings');
        const data = res.data?.data || res.data;
        if (data) {
          setFormData({
            clinicName: data.clinicName || 'Ewa Derma Clinic',
            address: data.address || '',
            contactNumber: data.contactNumber || '',
            email: data.email || '',
            gstNumber: data.gstNumber || '',
            taxRate: data.taxRate !== undefined ? Number(data.taxRate) : 18,
            openingTime: data.openingTime || '10:00',
            closingTime: data.closingTime || '19:00',
            operatingDays: data.operatingDays || 'Mon,Tue,Wed,Thu,Fri,Sat',
            slotDuration: data.slotDuration || 30,
            logoUrl: data.logoUrl || '/ewa-derma-logo.jpg',
          });

          if (data.operatingDays) {
            setSelectedDays(data.operatingDays.split(',').map((d: string) => d.trim()));
          }
        }
      } catch (err: any) {
        showToast('Failed to load clinic settings', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    if (hasRole('ADMIN')) {
      fetchSettings();
      fetchStorageStats();
    } else {
      setIsLoading(false);
    }
  }, [hasRole, showToast]);

  if (!hasRole('ADMIN')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Access Restricted</h2>
        <p className="text-sm text-text-muted mt-2 max-w-md">
          Only administrators with the <Badge variant="accent">ADMIN</Badge> role are authorized to modify clinical and operational settings.
        </p>
      </div>
    );
  }

  const handleDayToggle = (day: string) => {
    let updated: string[];
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        showToast('Clinic must operate at least one day per week', 'warning');
        return;
      }
      updated = selectedDays.filter((d) => d !== day);
    } else {
      updated = [...selectedDays, day];
    }
    setSelectedDays(updated);
    setFormData((prev) => ({ ...prev, operatingDays: updated.join(',') }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo file size must be less than 5MB', 'warning');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    setIsUploadingLogo(true);
    try {
      const res = await api.post('/admin/settings/logo', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const logoUrl = res.data?.data?.url || res.data?.url;
      setFormData((prev) => ({ ...prev, logoUrl }));
      updateClinic({ logoUrl });
      showToast('Clinic logo uploaded successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to upload logo image', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clinicName.trim()) {
      showToast('Clinic Name is required', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        operatingDays: selectedDays.join(','),
        taxRate: Number(formData.taxRate),
        slotDuration: Number(formData.slotDuration),
      };

      const res = await api.patch('/admin/settings', payload);
      const updated = res.data?.data || res.data;

      // Update auth context so Navbar and Logo reflect updates immediately
      updateClinic({
        clinicName: updated.clinicName,
        address: updated.address,
        contactNumber: updated.contactNumber,
        email: updated.email,
        gstNumber: updated.gstNumber,
        taxRate: updated.taxRate,
        openingTime: updated.openingTime,
        closingTime: updated.closingTime,
        operatingDays: updated.operatingDays,
        slotDuration: updated.slotDuration,
        logoUrl: updated.logoUrl,
      });

      await refreshProfile();
      showToast('Clinic settings updated and applied app-wide!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update clinic settings';
      showToast(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={3} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Clinic Settings</h1>
            <Badge variant="accent" size="sm">
              Admin Configuration
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Configure primary clinic identity, contact channels, tax rates, operating hours, and brand logo.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand & Logo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Clinic Brand & Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-surface/60 border border-surface-border">
              {/* Logo Preview */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-accent shadow-md bg-white shrink-0 relative flex items-center justify-center">
                {formData.logoUrl ? (
                  <Image
                    src={formData.logoUrl}
                    alt="Clinic Logo Preview"
                    fill
                    sizes="96px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-text-muted" />
                )}
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <h4 className="text-sm font-semibold text-text-primary">Clinic Brand Logo</h4>
                <p className="text-xs text-text-muted">
                  Supports PNG, JPG, WebP, SVG up to 5MB. Logo appears across receipts, prescriptions, and navigation bar.
                </p>
                <div className="flex items-center gap-3 justify-center sm:justify-start pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    leftIcon={<UploadCloud className="w-4 h-4" />}
                  >
                    {isUploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Clinic Legal Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.clinicName}
                  onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                  placeholder="e.g. Ewa Derma Clinic"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Official Email Address
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@ewaderma.com"
                  leftIcon={<Mail className="w-4 h-4 text-text-muted" />}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Primary Contact Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  placeholder="+91 9120854977"
                  leftIcon={<Phone className="w-4 h-4 text-text-muted" />}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Physical Clinic Address <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Landmark, City, State, PIN"
                  leftIcon={<MapPin className="w-4 h-4 text-text-muted" />}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial & Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Taxation & Billing Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                GST / Tax Registration Number (GSTIN)
              </label>
              <Input
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                placeholder="29ABCDE1234F1Z5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Default GST / Tax Rate (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                placeholder="18.0"
                leftIcon={<Percent className="w-4 h-4 text-text-muted" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operations & Schedule Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Operating Hours & Appointment Slots
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Opening Time (HH:mm)
                </label>
                <Input
                  type="time"
                  value={formData.openingTime}
                  onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Closing Time (HH:mm)
                </label>
                <Input
                  type="time"
                  value={formData.closingTime}
                  onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Default Slot Duration (Minutes)
                </label>
                <select
                  value={formData.slotDuration}
                  onChange={(e) => setFormData({ ...formData, slotDuration: parseInt(e.target.value, 10) })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes (Standard)</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
            </div>

            {/* Operating Days */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-2">
                Operating Days of the Week
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 border ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-white text-text-muted border-surface-border hover:bg-surface'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. MEDIA STORAGE & AUTO-CLEANUP MANAGEMENT (ADMIN ONLY) */}
        <Card accentTop className="border-primary/20 bg-surface">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border/70 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base">Media Storage &amp; Auto-Cleanup Management</CardTitle>
                <p className="text-xs text-text-muted mt-0.5">
                  Monitor clinical photo storage and purge old records past your retention window
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchStorageStats}
              disabled={isLoadingStorage}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingStorage ? 'animate-spin' : ''}`} />}
            >
              Refresh Storage Stats
            </Button>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            {/* 3 Metric Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Total Photos */}
              <div className="p-4 rounded-xl bg-surface-raised border border-surface-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-primary" /> Total Clinical Photos
                  </span>
                  <Badge variant="primary" size="sm">
                    {storageStats?.estimatedSizeMB || 0} MB
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {storageStats?.totalPhotos?.toLocaleString() || 0}{' '}
                  <span className="text-xs font-normal text-text-muted">items stored</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Auto-compressed WebP format (~150 KB per photo)
                </p>
              </div>

              {/* Card 2: Storage Utilization */}
              <div className="p-4 rounded-xl bg-surface-raised border border-surface-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" /> Storage Capacity (Railway DB)
                  </span>
                  <Badge variant="success" size="sm">
                    {storageStats?.usedPercentage || 0}% Used
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {storageStats?.estimatedSizeMB || 0}{' '}
                  <span className="text-xs font-normal text-text-muted">/ 5,000 MB</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(2, storageStats?.usedPercentage || 0))}%` }}
                  />
                </div>
              </div>

              {/* Card 3: Photo Categories */}
              <div className="p-4 rounded-xl bg-surface-raised border border-surface-border space-y-2">
                <span className="text-xs font-semibold text-text-secondary block">
                  Category Breakdown
                </span>
                <div className="space-y-1.5 text-xs text-text-primary">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Before Photos:</span>
                    <span className="font-bold">{storageStats?.beforePhotosCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">After Photos:</span>
                    <span className="font-bold">{storageStats?.afterPhotosCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Prescription Scans:</span>
                    <span className="font-bold">{storageStats?.prescriptionScansCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* One-Click Automated Retention Cleanup Tool */}
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Automated Media Retention &amp; Bulk Storage Purge
                  </h4>
                  <p className="text-xs text-amber-800">
                    Purge old clinical photos and prescription scans past your legal retention window to permanently reclaim database space.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-amber-200/60">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-amber-950 shrink-0">
                    Purge photos older than:
                  </label>
                  <select
                    value={cleanupMonths}
                    onChange={(e) => setCleanupMonths(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white font-medium text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value={12}>1 Year (12 months)</option>
                    <option value={24}>2 Years (24 months)</option>
                    <option value={36}>3 Years (36 months)</option>
                    <option value={60}>5 Years (60 months)</option>
                  </select>
                </div>

                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleBulkCleanup}
                  disabled={isCleaningUp || !storageStats?.totalPhotos}
                  leftIcon={isCleaningUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                >
                  {isCleaningUp ? 'Purging Photos...' : 'Purge Old Media Now'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
          <Button
            type="submit"
            size="lg"
            disabled={isSaving}
            leftIcon={isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          >
            {isSaving ? 'Saving Changes...' : 'Save Clinic Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
