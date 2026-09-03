'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Plus, Trash2, Tag, Percent, IndianRupee } from 'lucide-react';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPatientId?: string;
  initialPatientName?: string;
}

interface LineItem {
  id: string;
  itemType: 'SERVICE' | 'MEDICINE';
  serviceId?: string;
  medicineId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  initialPatientId = '',
  initialPatientName = '',
}: CreateInvoiceModalProps) {
  const { showToast } = useToast();

  const [patients, setPatients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      itemType: 'SERVICE',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      if (initialPatientId) setSelectedPatientId(initialPatientId);

      // Load patients & services
      api.get('/patients').then((res) => setPatients(res.data.data.items || []));
      api.get('/services').then((res) => {
        const svcs = res.data.data || [];
        setServices(svcs);
        // Default first line item to Consultation service if empty
        if (svcs.length > 0 && !items[0].description) {
          const cons = svcs.find((s: any) => s.name.includes('Consultation')) || svcs[0];
          setItems([
            {
              id: '1',
              itemType: 'SERVICE',
              serviceId: cons.id,
              description: cons.name,
              quantity: 1,
              unitPrice: Number(cons.basePrice),
              discount: 0,
              taxRate: 0,
            },
          ]);
        }
      });
    }
  }, [isOpen, initialPatientId]);

  const handleAddServiceItem = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;

    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        itemType: 'SERVICE',
        serviceId: svc.id,
        description: svc.name,
        quantity: 1,
        unitPrice: Number(svc.basePrice),
        discount: 0,
        taxRate: 0,
      },
    ]);
  };

  const handleAddCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        itemType: 'MEDICINE',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'serviceId') {
            const s = services.find((svc) => svc.id === value);
            if (s) {
              updated.description = s.name;
              updated.unitPrice = Number(s.basePrice);
            }
          }
          return updated;
        }
        return item;
      }),
    );
  };

  // Subtotal & Calculations
  const subTotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const netBeforeTax = Math.max(0, subTotal - (discountAmount || 0));
  const taxAmount = (netBeforeTax * (taxRate || 0)) / 100;
  const totalAmount = netBeforeTax + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      showToast('Please select a patient', 'error');
      return;
    }
    if (discountAmount > 0 && !discountReason.trim()) {
      showToast('Discount reason is required when a discount is applied', 'error');
      return;
    }

    const invalidItem = items.find((i) => !i.description.trim() || i.unitPrice < 0);
    if (invalidItem) {
      showToast('Please complete all line item descriptions and valid prices', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/invoices', {
        patientId: selectedPatientId,
        discountAmount,
        discountReason,
        taxRate,
        notes,
        items: items.map((i) => ({
          itemType: i.itemType,
          serviceId: i.serviceId || undefined,
          medicineId: i.medicineId || undefined,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          taxRate: i.taxRate,
        })),
      });

      showToast('Invoice generated successfully', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create invoice', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Invoice" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-5 text-text-main">
        {/* Patient Selection */}
        <div>
          <label className="text-xs font-semibold text-text-secondary block mb-1">
            Patient <span className="text-red-500">*</span>
          </label>
          {initialPatientId ? (
            <div className="p-2.5 bg-primary-50 rounded-xl border border-primary/20 text-sm font-semibold text-primary">
              {initialPatientName || 'Selected Patient'}
            </div>
          ) : (
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full h-10 rounded-xl border border-surface-border bg-white px-3 text-sm focus:border-primary focus:outline-none"
              required
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patientCode} - {p.firstName} {p.lastName} ({p.phone})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Line Items Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Billable Line Items
            </h3>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) handleAddServiceItem(e.target.value);
                  e.target.value = '';
                }}
                className="h-8 rounded-lg border border-surface-border bg-white px-2.5 text-xs text-primary font-semibold focus:outline-none"
              >
                <option value="">+ Add Service Item...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (₹{s.basePrice})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-surface hover:bg-gray-100 text-text-secondary font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Prescribed Item
              </button>
            </div>
          </div>

          <div className="border border-surface-border rounded-2xl overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 w-20">Qty</th>
                  <th className="p-3 w-28">Price (₹)</th>
                  <th className="p-3 w-28">Total (₹)</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.itemType === 'SERVICE'
                            ? 'bg-purple-100 text-primary'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.itemType}
                      </span>
                    </td>
                    <td className="p-2.5">
                      {item.itemType === 'SERVICE' && item.serviceId ? (
                        <select
                          value={item.serviceId}
                          onChange={(e) => handleItemChange(item.id, 'serviceId', e.target.value)}
                          className="w-full h-8 rounded-lg border border-surface-border px-2 text-xs"
                        >
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          placeholder="Item name / Medicine description"
                          className="w-full h-8 rounded-lg border border-surface-border px-2 text-xs focus:outline-none"
                        />
                      )}
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full h-8 rounded-lg border border-surface-border px-2 text-xs text-center"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full h-8 rounded-lg border border-surface-border px-2 text-xs"
                      />
                    </td>
                    <td className="p-2.5 font-bold text-text-main">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length === 1}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discount & Tax Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface p-4 rounded-2xl border border-surface-border">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Invoice Discount (₹)
              </label>
              <Input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="text-xs"
              />
            </div>
            {discountAmount > 0 && (
              <div>
                <label className="text-xs font-semibold text-red-600 block mb-1">
                  Discount Reason / Audit Note <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g. Festival Offer, Doctor Approval, Staff Family"
                  className="text-xs border-red-300 focus:border-red-500"
                  required
                />
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs text-text-secondary self-end">
            <div className="flex justify-between py-1 border-b border-surface-border">
              <span>Subtotal:</span>
              <span className="font-semibold text-text-main">₹{subTotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between py-1 border-b border-surface-border text-emerald-700 font-semibold">
                <span>Discount:</span>
                <span>- ₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-surface-border">
              <span>Tax ({taxRate}%):</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 text-sm font-bold text-primary border-t border-primary/20">
              <span>Total Payable:</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Generate Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
}
