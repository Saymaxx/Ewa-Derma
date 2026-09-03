'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ShoppingCart, Plus, Calendar, Package, Sliders } from 'lucide-react';

export default function PurchasesPage() {
  const { showToast } = useToast();

  const [purchases, setPurchases] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, mRes, sRes] = await Promise.all([
        api.get('/inventory/purchases').catch(() => ({ data: { data: [] } })),
        api.get('/medicines', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
        api.get('/suppliers').catch(() => ({ data: { data: [] } })),
      ]);
      const pData = pRes?.data?.data ?? pRes?.data;
      const mData = mRes?.data?.data ?? mRes?.data;
      const sData = sRes?.data?.data ?? sRes?.data;
      setPurchases(Array.isArray(pData) ? pData : (Array.isArray(pData?.items) ? pData.items : []));
      setMedicines(Array.isArray(mData) ? mData : (Array.isArray(mData?.items) ? mData.items : []));
      setSuppliers(Array.isArray(sData) ? sData : (Array.isArray(sData?.items) ? sData.items : []));
    } catch (err) {
      showToast('Failed to load purchase history', 'error');
      setPurchases([]);
      setMedicines([]);
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId || !batchNumber.trim() || quantity <= 0) {
      showToast('Please select a medicine, enter batch number and valid quantity', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/purchases', {
        medicineId: selectedMedId,
        supplierId: selectedSupplierId || undefined,
        batchNumber,
        quantity,
        purchasePrice,
        expiryDate,
        referenceNumber: refNo,
        notes,
      });

      showToast('Stock purchase recorded successfully', 'success');
      setIsModalOpen(false);
      fetchPurchases();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to record purchase', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const purchaseList = Array.isArray(purchases) ? purchases : [];
  const medList = Array.isArray(medicines) ? medicines : [];
  const supplierList = Array.isArray(suppliers) ? suppliers : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-main">Stock Purchase Orders</h1>
            <Badge variant="accent" size="sm">Stock IN</Badge>
          </div>
          <p className="text-xs text-text-secondary">
            Record incoming pharmaceutical shipments, create medicine batches, and track vendor purchase prices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record New Purchase
          </Button>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-3">
        <Link href="/medicines">
          <Button variant="outline" size="sm" leftIcon={<Package className="w-4 h-4" />}>
            Formulary Roster
          </Button>
        </Link>
        <Link href="/inventory/purchases">
          <Button variant="primary" size="sm" leftIcon={<ShoppingCart className="w-4 h-4" />}>
            Purchases (In)
          </Button>
        </Link>
        <Link href="/inventory/adjustments">
          <Button variant="outline" size="sm" leftIcon={<Sliders className="w-4 h-4" />}>
            Adjustments
          </Button>
        </Link>
        <Link href="/inventory/expiry">
          <Button variant="outline" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
            Expiry Tracking
          </Button>
        </Link>
      </div>

      {/* Purchases History Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-text-secondary animate-pulse">
              Loading stock purchase history...
            </div>
          ) : purchaseList.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary">
              No purchase records logged yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Medicine Name</th>
                  <th className="p-3.5">Batch Number</th>
                  <th className="p-3.5">Supplier / Vendor</th>
                  <th className="p-3.5">Expiry Date</th>
                  <th className="p-3.5 text-right">Unit Cost (₹)</th>
                  <th className="p-3.5 text-center">Qty Received</th>
                  <th className="p-3.5">Reference No.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {purchaseList.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3.5 font-medium">{p.createdAt?.split('T')[0]}</td>
                    <td className="p-3.5 font-bold text-primary">{p.medicine?.name}</td>
                    <td className="p-3.5 font-mono font-semibold">{p.batch?.batchNumber}</td>
                    <td className="p-3.5 text-text-secondary">
                      {p.batch?.supplier?.name || 'General Supplier'}
                    </td>
                    <td className="p-3.5 text-text-secondary">
                      {p.batch?.expiryDate?.split('T')[0]}
                    </td>
                    <td className="p-3.5 text-right font-semibold">
                      ₹{Number(p.batch?.purchasePrice || 0).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-700">
                      +{p.quantity}
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">{p.referenceNumber || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Record Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Stock Purchase Receipt"
        maxWidth="lg"
      >
        <form onSubmit={handleRecordPurchase} className="space-y-4 text-xs text-text-main">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Medicine <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMedId}
                onChange={(e) => setSelectedMedId(e.target.value)}
                className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
                required
              >
                <option value="">-- Select Medicine --</option>
                {medList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.brand || 'Generic'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Supplier / Vendor
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
              >
                <option value="">-- Select Supplier --</option>
                {supplierList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Batch Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-2026-A"
                className="text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Quantity Received <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Purchase Price per Unit (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-text-secondary block mb-1">
              Purchase Order / Invoice Ref Number
            </label>
            <Input
              type="text"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              placeholder="e.g. PO-9001"
              className="text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-text-secondary block mb-1">Notes</label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received 10 boxes intact"
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Confirm Purchase & Update Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
