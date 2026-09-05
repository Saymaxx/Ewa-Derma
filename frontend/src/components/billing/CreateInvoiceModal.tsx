'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/cache';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Plus, Trash2 } from 'lucide-react';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInvoice?: any) => void;
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
      setSelectedPatientId(initialPatientId || '');
      setDiscountAmount(0);
      setDiscountReason('');
      setTaxRate(0);
      setNotes('');
      setItems([
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

      // Load patients safely
      api
        .get('/patients')
        .then((res) => {
          const raw = res?.data?.data?.items ?? res?.data?.data ?? res?.data;
          setPatients(Array.isArray(raw) ? raw : []);
        })
        .catch(() => setPatients([]));

      // Load services safely (cached)
      const cachedServices = getCachedData<any[]>('services_list');
      if (cachedServices) {
        setServices(cachedServices);
        if (cachedServices.length > 0) {
          const cons = cachedServices.find((s: any) => s.name?.includes('Consultation')) || cachedServices[0];
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
      } else {
        api
          .get('/services')
          .then((res) => {
            const raw = res?.data?.data ?? res?.data;
            const svcs = Array.isArray(raw) ? raw : [];
            setCachedData('services_list', svcs, 300000); // 5 min TTL
            setServices(svcs);

            if (svcs.length > 0) {
              const cons = svcs.find((s: any) => s.name?.includes('Consultation')) || svcs[0];
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
          })
          .catch(() => setServices([]));
      }
    }
  }, [isOpen, initialPatientId]);

  const safeServices = Array.isArray(services) ? services : [];
  const safePatients = Array.isArray(patients) ? patients : [];

  const handleAddServiceItem = (serviceId: string) => {
    const svc = safeServices.find((s) => s.id === serviceId);
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
            const s = safeServices.find((svc) => svc.id === value);
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
  const calculatedTax = (netBeforeTax * (taxRate || 0)) / 100;
  const totalAmount = netBeforeTax + calculatedTax;

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      showToast('Please select a patient from the list', 'error');
      return;
    }

    const invalidItems = items.filter((i) => !i.description || i.quantity <= 0);
    if (invalidItems.length > 0) {
      showToast('Please complete all line item descriptions and quantities', 'error');
      return;
    }

    if (discountAmount > 0 && (!discountReason || !discountReason.trim())) {
      showToast('Please provide a discount reason whenever a discount is applied', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        patientId: selectedPatientId,
        discountAmount: Number(discountAmount) || 0,
        discountReason: discountReason || undefined,
        taxRate: Number(taxRate) || 0,
        notes: notes || undefined,
        items: items.map((i) => ({
          itemType: i.itemType,
          serviceId: i.serviceId || undefined,
          medicineId: i.medicineId || undefined,
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount) || 0,
          taxRate: Number(i.taxRate) || 0,
        })),
      };

      const res = await api.post('/invoices', payload);
      const createdInvoice = res?.data?.data ?? res?.data;
      showToast(res.data?.message || 'Invoice generated successfully!', 'success');
      onSuccess(createdInvoice);
      onClose();
    } catch (err: any) {
      let errMsg = 'Failed to generate invoice';
      if (err.response?.data?.message) {
        errMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(', ')
          : err.response.data.message;
      } else if (err.response?.data?.error?.message) {
        errMsg = err.response.data.error.message;
      }
      showToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Patient Invoice"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Patient Selection Header */}
        <div className="bg-surface p-4 rounded-2xl border border-surface-border space-y-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
            Select Patient <span className="text-red-500">*</span>
          </label>

          {initialPatientName ? (
            <div className="h-10 rounded-xl bg-white border border-surface-border px-3.5 flex items-center font-bold text-xs text-text-main">
              {initialPatientName}
            </div>
          ) : (
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full h-10 rounded-xl border border-surface-border bg-white px-3.5 text-xs font-semibold text-text-main focus:border-primary focus:outline-none"
            >
              <option value="">-- Select Patient --</option>
              {safePatients.map((p) => (
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
                {safeServices.map((s) => (
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
                Add Custom Item
              </button>
            </div>
          </div>

          <div className="border border-surface-border rounded-2xl overflow-x-auto bg-surface">
            <table className="w-full min-w-[520px] text-left text-xs">
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
                          {safeServices.map((s) => (
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
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary block">Discount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-text-muted">₹</span>
              <Input
                type="number"
                min="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="pl-7 text-xs"
              />
            </div>
            <Input
              type="text"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="Discount Reason (e.g. Promotional offer)"
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary block">Tax Rate (GST %)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-text-muted">%</span>
              <Input
                type="number"
                min="0"
                max="100"
                value={taxRate || ''}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="pl-7 text-xs"
              />
            </div>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Invoice Notes / Payment Instructions"
              className="text-xs"
            />
          </div>
        </div>

        {/* Total Summary Footer */}
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs text-text-secondary flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Subtotal: <strong>₹{subTotal.toFixed(2)}</strong></span>
              <span>Discount: <strong className="text-red-600">-₹{discountAmount.toFixed(2)}</strong></span>
              <span>GST ({taxRate}%): <strong>+₹{calculatedTax.toFixed(2)}</strong></span>
            </div>
            <div className="text-xs text-text-muted">
              Official clinic invoice code will be generated automatically.
            </div>
          </div>
          <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-primary/10">
            <span className="text-xs text-text-secondary block uppercase font-bold tracking-wider">Total Amount Due</span>
            <span className="text-2xl font-bold font-mono text-primary">
              ₹{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            Generate Invoice
          </Button>
        </div>
      </div>
    </Modal>
  );
}
