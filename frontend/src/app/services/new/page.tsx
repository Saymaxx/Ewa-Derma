'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles,
  ArrowLeft,
  Layers,
  IndianRupee,
  ShieldAlert,
  Percent,
  PlusCircle,
  FileText,
} from 'lucide-react';

const DEFAULT_SERVICE_CATEGORIES = [
  'Procedure',
  'Medi-Facial',
  'Laser',
  'Hair Care',
  'Injectable',
  'Chemical Peel',
  'Consultation',
  'Surgery / Minor OT',
  'Other',
];

export default function AddNewServicePage() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const isAdmin = hasRole('ADMIN');

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Procedure');
  const [customCategory, setCustomCategory] = useState('');
  const [basePrice, setBasePrice] = useState<number | ''>(1500);
  const [taxRate, setTaxRate] = useState<number | ''>(0);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If not Admin, show access restricted state
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 text-status-danger rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-text-primary">Admin Access Required</h1>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Only Clinic Administrators have permission to register and configure new clinical services and procedure fees.
        </p>
        <Link href="/services">
          <Button variant="outline" size="sm" className="mt-2">
            Back to Services & Pricing
          </Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Service / Procedure name is required', 'warning', 'Missing Name');
      return;
    }

    if (basePrice === '' || Number(basePrice) < 0) {
      showToast('Base price must be a valid non-negative number', 'warning', 'Invalid Price');
      return;
    }

    const finalCategory =
      category === '__CUSTOM__'
        ? customCategory.trim() || 'Procedure'
        : category.trim() || 'Procedure';

    setIsSubmitting(true);
    try {
      await api.post('/services', {
        name: name.trim(),
        category: finalCategory,
        description: description.trim() || undefined,
        basePrice: Number(basePrice),
        taxRate: taxRate === '' ? 0 : Number(taxRate),
        isActive: true,
      });

      showToast(
        `Service "${name.trim()}" added to clinical catalog and billable workflows!`,
        'success',
        'Service Registered',
      );
      router.push('/services');
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Creation Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/services"
              className="p-1 rounded-lg text-text-secondary hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold font-serif text-text-primary flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-primary" />
              Add New Service / Procedure
            </h1>
          </div>
          <p className="text-xs text-text-secondary pl-7">
            Register new dermatological procedures, medi-facials, laser sessions, and clinical treatments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/services">
            <Button variant="outline" size="sm" leftIcon={<Layers className="w-4 h-4" />}>
              View All Services
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. General Service & Clinical Identity */}
        <Card>
          <CardHeader className="pb-3 border-b border-surface-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4 text-accent" />
              1. General Service & Procedure Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Treatment / Service Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. HydraFacial Elite, Carbon Laser Peel, PRP Hair Therapy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs font-medium"
                  required
                />
                <p className="text-[11px] text-text-muted mt-1">
                  This name will show on Walk-In queues, doctor procedure logs, and patient billing invoices.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Service Category
                </label>
                <div className={category === '__CUSTOM__' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : ''}>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    {DEFAULT_SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Custom Category...</option>
                  </select>

                  {category === '__CUSTOM__' && (
                    <Input
                      type="text"
                      placeholder="Enter Custom Category (e.g. Thread Lift, Micro-needling)"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="text-xs"
                      autoFocus
                    />
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Categorizes the treatment for filtered reporting, walk-in categorization, and billing.
                </p>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-main">
                    Description / Clinical Notes <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <span className={`text-[11px] ${description.length > 260 ? 'text-amber-600 font-semibold' : 'text-text-muted'}`}>
                    {description.length}/280
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={280}
                  placeholder="e.g. Deep cleansing, exfoliation, and hydration infusion. Typical session duration: 45 mins."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-white p-2.5 text-xs text-text-primary focus:border-primary focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Brief note explaining indications, duration, or procedure steps (shown to reception and doctors).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Commercial Pricing & GST */}
        <Card>
          <CardHeader className="pb-3 border-b border-surface-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
              <IndianRupee className="w-4 h-4 text-accent" />
              2. Baseline Pricing & Tax Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Standard Clinic Rate / Base Price (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                  className="text-xs font-semibold"
                  placeholder="1500"
                  required
                />
                <p className="text-[10px] text-text-muted mt-1">
                  Standard billable amount auto-populated during invoicing and walk-in check-in.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  GST / Tax Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                  className="text-xs"
                  placeholder="0 (Exempt) or 18"
                />
                <p className="text-[10px] text-text-muted mt-1">
                  Leave as 0 for healthcare tax exemption, or specify percentage.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submission Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/services">
            <Button type="button" variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Save & Publish Service
          </Button>
        </div>
      </form>
    </div>
  );
}
