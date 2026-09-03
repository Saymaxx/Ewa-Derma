'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Calendar, Package, ShoppingCart, Sliders, AlertTriangle, Trash2 } from 'lucide-react';

export default function ExpiryPage() {
  const { showToast } = useToast();

  const [alertsData, setAlertsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXPIRED' | 'EXPIRING_30' | 'EXPIRING_60'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Write-Off Modal
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isWriteOffOpen, setIsWriteOffOpen] = useState(false);
  const [writeOffReason, setWriteOffReason] = useState('Expired batch disposal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/alerts');
      setAlertsData(res.data.data || null);
    } catch (err) {
      showToast('Failed to load expiry alerts', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleOpenWriteOff = (batch: any) => {
    setSelectedBatch(batch);
    setWriteOffReason(`Disposal of ${batch.status.toLowerCase()} batch ${batch.batchNumber}`);
    setIsWriteOffOpen(true);
  };

  const handleConfirmWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSubmitting(true);
    try {
      await api.post('/inventory/adjustments', {
        medicineId: selectedBatch.medicineId,
        batchId: selectedBatch.batchId,
        transactionType: 'EXPIRED_OUT',
        quantity: selectedBatch.computedStock,
        reason: writeOffReason,
      });

      showToast(`Batch ${selectedBatch.batchNumber} written off successfully`, 'success');
      setIsWriteOffOpen(false);
      fetchAlerts();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to write off batch', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allBatches = Array.isArray(alertsData?.expiringBatches) ? alertsData.expiringBatches : [];
  const filteredBatches = allBatches.filter((b: any) => {
    if (activeTab === 'ALL') return true;
    return b.status === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-text-main">Batch Expiry Management</h1>
                <Badge variant="accent" size="sm">FEFO Safeguard</Badge>
              </div>
              <p className="text-xs text-text-secondary">
                Track batches nearing expiration. Expired batches are automatically blocked from FEFO prescription dispensing.
              </p>
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
              <Button variant="outline" size="sm" leftIcon={<Sliders className="w-4 h-4" />}>
                Adjustments
              </Button>
            </Link>
            <Link href="/inventory/expiry">
              <Button variant="primary" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
                Expiry Tracking
              </Button>
            </Link>
          </div>

          {/* Urgency Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-secondary hover:bg-gray-100'
              }`}
            >
              All Alerts ({allBatches.length})
            </button>
            <button
              onClick={() => setActiveTab('EXPIRED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'EXPIRED'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-text-secondary hover:bg-gray-100'
              }`}
            >
              Already Expired ({alertsData?.summary?.expiredCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('EXPIRING_30')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'EXPIRING_30'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-text-secondary hover:bg-gray-100'
              }`}
            >
              Expiring &lt;30 Days ({alertsData?.summary?.expiring30Count || 0})
            </button>
            <button
              onClick={() => setActiveTab('EXPIRING_60')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'EXPIRING_60'
                  ? 'bg-yellow-600 text-white shadow-sm'
                  : 'bg-white text-text-secondary hover:bg-gray-100'
              }`}
            >
              Expiring &lt;60 Days ({alertsData?.summary?.expiring60Count || 0})
            </button>
          </div>

          {/* Expiry Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-text-secondary animate-pulse">
                  Loading expiry alert tracking...
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-secondary">
                  No medicine batches matching expiry criteria.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                    <tr>
                      <th className="p-3.5">Batch Number</th>
                      <th className="p-3.5">Medicine Name</th>
                      <th className="p-3.5">Supplier / Vendor</th>
                      <th className="p-3.5">Expiry Date</th>
                      <th className="p-3.5 text-center">Batch Stock</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Disposal Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {filteredBatches.map((b: any) => {
                      const isExpired = b.status === 'EXPIRED';
                      return (
                        <tr
                          key={b.batchId}
                          className={`hover:bg-gray-50 transition-colors ${
                            isExpired ? 'bg-red-50/40' : 'bg-amber-50/30'
                          }`}
                        >
                          <td className="p-3.5 font-mono font-bold text-primary">{b.batchNumber}</td>
                          <td className="p-3.5 font-bold text-text-main">{b.medicineName}</td>
                          <td className="p-3.5 text-text-secondary">{b.supplierName}</td>
                          <td className="p-3.5 font-semibold text-text-main">
                            {b.expiryDate?.split('T')[0]}
                          </td>
                          <td className="p-3.5 text-center font-bold text-base">{b.computedStock}</td>
                          <td className="p-3.5 text-center">
                            {isExpired ? (
                              <Badge variant="danger" size="sm" dot>
                                EXPIRED
                              </Badge>
                            ) : b.status === 'EXPIRING_30' ? (
                              <Badge variant="accent" size="sm" dot>
                                EXPIRING IN 30 DAYS
                              </Badge>
                            ) : (
                              <Badge variant="warning" size="sm" dot>
                                EXPIRING IN 60 DAYS
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleOpenWriteOff(b)}
                              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                            >
                              Write Off
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Write Off Modal */}
          {selectedBatch && (
            <Modal
              isOpen={isWriteOffOpen}
              onClose={() => setIsWriteOffOpen(false)}
              title={`Write Off Expired Batch — ${selectedBatch.batchNumber}`}
              maxWidth="md"
            >
              <form onSubmit={handleConfirmWriteOff} className="space-y-4 text-xs text-text-main">
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Confirm Stock Disposal
                  </p>
                  <p className="mt-1">
                    This will deduct all <strong>{selectedBatch.computedStock} units</strong> of{' '}
                    <strong>{selectedBatch.medicineName}</strong> (Batch: {selectedBatch.batchNumber}) from inventory via an EXPIRED_OUT audit transaction.
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-text-secondary block mb-1">
                    Audit Notes / Reason for Disposal
                  </label>
                  <textarea
                    rows={3}
                    value={writeOffReason}
                    onChange={(e) => setWriteOffReason(e.target.value)}
                    className="w-full p-3 rounded-xl border border-surface-border bg-white text-xs focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setIsWriteOffOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    type="submit"
                    isLoading={isSubmitting}
                  >
                    Confirm Write Off
                  </Button>
                </div>
              </form>
            </Modal>
          )}
    </div>
  );
}
