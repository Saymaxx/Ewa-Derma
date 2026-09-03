'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  PackagePlus,
  ArrowLeft,
  Package,
  Layers,
  IndianRupee,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Sliders,
  Calendar,
  Building2,
} from 'lucide-react';

const COMMON_UNITS = [
  'Tube',
  'Tablet',
  'Capsule',
  'Bottle',
  'Vial',
  'Sachet',
  'Cream',
  'Gel',
  'Serum',
  'Lotion',
  'Soap / Bar',
  'Kit',
  'Pump Dispenser',
];

export default function AddNewMedicinePage() {
  const { showToast } = useToast();
  const router = useRouter();

  // Category State
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [genericName, setGenericName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('Tube');
  const [customUnit, setCustomUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(350);
  const [mrp, setMrp] = useState<number>(399);
  const [purchasePrice, setPurchasePrice] = useState<number>(220);
  const [minimumStock, setMinimumStock] = useState<number>(10);
  const [gstRate, setGstRate] = useState<number>(12);

  // Initial Stock Batch Option
  const [hasInitialStock, setHasInitialStock] = useState(false);
  const [initialSupplierId, setInitialSupplierId] = useState('');
  const [initialBatchNo, setInitialBatchNo] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number>(50);
  const [initialExpiryDate, setInitialExpiryDate] = useState('2028-06-30');
  const [initialRefNo, setInitialRefNo] = useState('');

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, supRes] = await Promise.all([
          api.get('/medicines/categories').catch(() => ({ data: { data: [] } })),
          api.get('/suppliers').catch(() => ({ data: { data: [] } })),
        ]);
        const catData = catRes?.data?.data ?? catRes?.data;
        const supData = supRes?.data?.data ?? supRes?.data;
        setCategories(Array.isArray(catData) ? catData : []);
        setSuppliers(Array.isArray(supData) ? supData : []);
      } catch (err) {
        showToast('Notice: Could not load categories list', 'info');
      } finally {
        setIsLoadingMeta(false);
      }
    };
    fetchMetadata();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Medicine Name is required', 'error');
      return;
    }

    if (hasInitialStock && (!initialBatchNo.trim() || initialQuantity <= 0)) {
      showToast('Please provide a valid Batch Number and Quantity for the initial stock', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalUnit = unit === 'OTHER' ? customUnit.trim() || 'Unit' : unit;

      // 1. Create the Master Medicine
      const createRes = await api.post('/medicines', {
        name: name.trim(),
        brand: brand.trim() || undefined,
        genericName: genericName.trim() || undefined,
        categoryId: categoryId || undefined,
        unit: finalUnit,
        unitPrice: Number(unitPrice) || 0,
        mrp: Number(mrp) || Number(unitPrice) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        minimumStock: Number(minimumStock) || 10,
        gstRate: Number(gstRate) || 0,
      });

      const newMedicine = createRes?.data?.data;
      const medicineId = newMedicine?.id;

      // 2. If Initial Stock checked, create initial purchase entry
      if (hasInitialStock && medicineId) {
        await api.post('/inventory/purchases', {
          medicineId,
          supplierId: initialSupplierId || undefined,
          batchNumber: initialBatchNo.trim(),
          quantity: Number(initialQuantity),
          purchasePrice: Number(purchasePrice) || 0,
          expiryDate: initialExpiryDate,
          referenceNumber: initialRefNo.trim() || 'INITIAL-STOCK',
          notes: 'Initial opening stock registered during medicine master onboarding',
        });
      }

      showToast(`Medicine "${name.trim()}" added to formulary successfully!`, 'success');
      router.push('/medicines');
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create medicine', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryList = Array.isArray(categories) ? categories : [];
  const supplierList = Array.isArray(suppliers) ? suppliers : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/medicines"
              className="p-1 rounded-lg text-text-secondary hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold font-serif text-text-primary flex items-center gap-2">
              <PackagePlus className="w-6 h-6 text-primary" />
              Add New Medicine to Catalog
            </h1>
          </div>
          <p className="text-xs text-text-secondary pl-7">
            Feed brand new dermatological products, pharmaceuticals, or compounded formulas into the clinical database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/medicines">
            <Button variant="outline" size="sm" leftIcon={<Package className="w-4 h-4" />}>
              Back to Formulary
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Core Clinical Details */}
        <Card>
          <CardHeader className="pb-3 border-b border-surface-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4 text-accent" />
              1. General Medicine & Clinical Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Medicine Display Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Tretinoin 0.05% Gel (20g)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  required
                />
                <p className="text-[11px] text-text-muted mt-1">
                  This is the primary name that will show in doctor prescription dropdowns & billing invoices.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Brand / Trade Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Retino-A, Sebogel, Bioderma"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Generic Chemical Molecule
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Tretinoin, Salicylic Acid, Minoxidil"
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Dermatology Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="">-- Select Category (Optional) --</option>
                  {categoryList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Packaging / Unit Formulation <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
                    required
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="OTHER">Other Custom Unit...</option>
                  </select>

                  {unit === 'OTHER' && (
                    <Input
                      type="text"
                      placeholder="Specify Unit (e.g. Spray)"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="text-xs"
                      required
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Pricing & Stock Safeguards */}
        <Card>
          <CardHeader className="pb-3 border-b border-surface-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
              <IndianRupee className="w-4 h-4 text-accent" />
              2. Commercial Pricing & Inventory Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Selling Price / Clinic Rate (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="text-xs font-semibold"
                  required
                />
                <p className="text-[10px] text-text-muted mt-1">Price charged to patient on invoice</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Maximum Retail Price / MRP (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={mrp}
                  onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                  className="text-xs"
                />
                <p className="text-[10px] text-text-muted mt-1">Printed MRP on box</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Standard Purchase Cost (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="text-xs"
                />
                <p className="text-[10px] text-text-muted mt-1">Cost incurred from supplier/vendor</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-border">
              <div>
                <label className="text-xs font-semibold text-text-main block mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Minimum Stock Alert Threshold (Units) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(parseInt(e.target.value) || 5)}
                  className="text-xs"
                  required
                />
                <p className="text-[10px] text-text-muted mt-1">
                  Triggers dashboard low-stock warning when total stock falls below this quantity.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-main block mb-1">
                  Applicable GST Rate (%)
                </label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="0">0% (Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST (Standard Pharma)</option>
                  <option value="18">18% GST (Cosmetics / Peels)</option>
                  <option value="28">28% GST</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Optional Opening Stock Inward Batch */}
        <Card className={hasInitialStock ? 'border-primary/40 bg-purple-50/20' : ''}>
          <CardHeader className="pb-3 border-b border-surface-border flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
              <Layers className="w-4 h-4 text-accent" />
              3. Inward Opening Stock Batch (Optional)
            </CardTitle>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasInitialStock}
                onChange={(e) => setHasInitialStock(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <span className="text-xs font-semibold text-text-main">
                Log initial stock batch now
              </span>
            </label>
          </CardHeader>

          {hasInitialStock && (
            <CardContent className="p-6 space-y-4">
              <p className="text-xs text-text-secondary">
                Directly creates the first active FEFO batch for this medicine so it becomes immediately dispensable.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">
                    Initial Batch Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. BATCH-2026-001"
                    value={initialBatchNo}
                    onChange={(e) => setInitialBatchNo(e.target.value)}
                    className="text-xs font-mono"
                    required={hasInitialStock}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">
                    Opening Quantity (Units) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 1)}
                    className="text-xs font-bold"
                    required={hasInitialStock}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">
                    Batch Expiry Date (FEFO) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={initialExpiryDate}
                    onChange={(e) => setInitialExpiryDate(e.target.value)}
                    className="text-xs"
                    required={hasInitialStock}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">
                    Vendor / Supplier
                  </label>
                  <select
                    value={initialSupplierId}
                    onChange={(e) => setInitialSupplierId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">-- General / Default Supplier --</option>
                    {supplierList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-text-main block mb-1">
                    Invoice / PO Reference Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. INV-INIT-2026"
                    value={initialRefNo}
                    onChange={(e) => setInitialRefNo(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/medicines">
            <Button variant="outline" size="md" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Save & Add Medicine to Database
          </Button>
        </div>
      </form>
    </div>
  );
}
