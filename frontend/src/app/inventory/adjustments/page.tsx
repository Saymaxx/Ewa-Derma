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
import { Sliders, Plus, Calendar, Package, ShoppingCart } from 'lucide-react';

export default function AdjustmentsPage() {
  const { showToast } = useToast();

  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [transactionType, setTransactionType] = useState('DAMAGED_OUT');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdjustments = useCallback(async () => {
    setIsLoading(true);
    try {
      const [aRes, mRes] = await Promise.all([
        api.get('/inventory/adjustments').catch(() => ({ data: { data: [] } })),
        api.get('/medicines', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
      ]);
      const aData = aRes?.data?.data ?? aRes?.data;
      const mData = mRes?.data?.data ?? mRes?.data;
      setAdjustments(Array.isArray(aData) ? aData : (Array.isArray(aData?.items) ? aData.items : []));
      setMedicines(Array.isArray(mData) ? mData : (Array.isArray(mData?.items) ? mData.items : []));
    } catch (err) {
      showToast('Failed to load stock adjustment history', 'error');
      setAdjustments([]);
      setMedicines([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId || !reason.trim() || quantity <= 0) {
      showToast('Please select a medicine, quantity, and provide a mandatory reason', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/adjustments', {
        medicineId: selectedMedId,
        transactionType,
        quantity: transactionType.includes('OUT') ? -Math.abs(quantity) : Math.abs(quantity),
        reason,
      });

      showToast('Stock adjustment ledger entry logged', 'success');
      setIsModalOpen(false);
      fetchAdjustments();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to record adjustment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjList = Array.isArray(adjustments) ? adjustments : [];
  const medList = Array.isArray(medicines) ? medicines : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-main">Manual Stock Adjustments</h1>
            <Badge variant="accent" size="sm">Audit Ledger</Badge>
          </div>
          <p className="text-xs text-text-secondary">
            Record stock write-offs (Damaged, Expired) or manual stock audit corrections. Written reason is mandatory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Stock Adjustment
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
          <Button variant="outline" size="sm" leftIcon={<ShoppingCart className="w-4 h-4" />}>
            Purchases (In)
          </Button>
        </Link>
        <Link href="/inventory/adjustments">
          <Button variant="primary" size="sm" leftIcon={<Sliders className="w-4 h-4" />}>
            Adjustments
          </Button>
        </Link>
        <Link href="/inventory/expiry">
          <Button variant="outline" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
            Expiry Tracking
          </Button>
        </Link>
      </div>

      {/* Adjustments Ledger Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-text-secondary animate-pulse">
              Loading stock adjustments ledger...
            </div>
          ) : adjList.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary">
              No stock adjustments recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Medicine Name</th>
                  <th className="p-3.5">Batch</th>
                  <th className="p-3.5 text-center">Type</th>
                  <th className="p-3.5 text-center">Qty Change</th>
                  <th className="p-3.5">Mandatory Reason / Audit Note</th>
                  <th className="p-3.5">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {adjList.map((a) => {
                  const isNegative = a.quantity < 0;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3.5 font-medium">{a.createdAt?.split('T')[0]}</td>
                      <td className="p-3.5 font-bold text-primary">{a.medicine?.name}</td>
                      <td className="p-3.5 font-mono">{a.batch?.batchNumber || 'General'}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isNegative
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {a.transactionType}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <span className={isNegative ? 'text-red-600' : 'text-emerald-600'}>
                          {a.quantity > 0 ? `+${a.quantity}` : a.quantity}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-text-main">{a.notes}</td>
                      <td className="p-3.5 text-text-secondary">
                        {a.dispensedBy
                          ? `${a.dispensedBy.firstName} ${a.dispensedBy.lastName}`
                          : 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Record Adjustment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Stock Adjustment Entry"
        maxWidth="md"
      >
        <form onSubmit={handleRecordAdjustment} className="space-y-4 text-xs text-text-main">
          <div>
            <label className="font-semibold text-text-secondary block mb-1">
              Medicine Item <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(e.target.value)}
              className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
              required
            >
              <option value="">-- Select Medicine to Adjust --</option>
              {medList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.brand || 'Generic'}) — Stock: {m.computedStock ?? 0}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-text-secondary block mb-1">
              Adjustment Type <span className="text-red-500">*</span>
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
              required
            >
              <option value="DAMAGED_OUT">DAMAGED_OUT (Stock Reduction)</option>
              <option value="EXPIRED_OUT">EXPIRED_OUT (Stock Reduction)</option>
              <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT (Physical Count Shortage)</option>
              <option value="ADJUSTMENT_IN">ADJUSTMENT_IN (Found Stock Excess)</option>
              <option value="RETURN_IN">RETURN_IN (Patient/Supplier Return)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-text-secondary block mb-1">
              Quantity <span className="text-red-500">*</span>
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
              Mandatory Audit Reason / Note <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State exact reason for stock adjustment (e.g., Broken container during shelf audit)"
              className="w-full p-3 rounded-xl border border-surface-border bg-white text-xs focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Log Adjustment Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
