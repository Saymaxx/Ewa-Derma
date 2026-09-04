'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import CreateInvoiceModal from '@/components/billing/CreateInvoiceModal';
import InvoiceDetailModal from '@/components/billing/InvoiceDetailModal';
import {
  CreditCard,
  Plus,
  Search,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';

export default function InvoicesPage() {
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/invoices', {
        params: {
          patientId: selectedPatientId || undefined,
          status: selectedStatus || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      const rawInvoices = res?.data?.data ?? res?.data;
      setInvoices(Array.isArray(rawInvoices) ? rawInvoices : []);
    } catch (err: any) {
      showToast('Failed to load invoices list', 'error');
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPatientId, selectedStatus, startDate, endDate, showToast]);

  useEffect(() => {
    api.get('/patients').then((res) => {
      const pData = res?.data?.data?.items ?? res?.data?.data ?? res?.data;
      setPatientsList(Array.isArray(pData) ? pData : []);
    }).catch(() => setPatientsList([]));
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const invoiceList = Array.isArray(invoices) ? invoices : [];
  const patients = Array.isArray(patientsList) ? patientsList : [];

  // Aggregate Metrics
  const totalBilled = invoiceList.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
  const totalPaid = invoiceList.reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0);
  const totalDue = invoiceList.reduce((acc, inv) => acc + Number(inv.dueAmount || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">Paid</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="accent">Partially Paid</Badge>;
      case 'PENDING':
        return <Badge variant="info">Pending</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      case 'REFUNDED':
        return <Badge variant="danger">Refunded</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-text-main">Billing & Invoices</h1>
                <Badge variant="accent" size="sm">Billing System</Badge>
              </div>
              <p className="text-xs text-text-secondary">
                Generate billing statements, collect partial/full payments, export PDFs, and manage refunds.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Generate New Invoice
            </Button>
          </div>

          {/* Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-secondary">Total Billed</p>
                  <p className="text-2xl font-bold text-primary mt-1">₹{totalBilled.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-secondary">Collected Revenue</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">₹{totalPaid.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-secondary">Outstanding Due</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">₹{totalDue.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-end justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Patient Filter */}
                <div className="w-48">
                  <label className="text-xs font-semibold text-text-secondary block mb-1">
                    Patient Filter
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">All Patients</option>
                    {patientsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.patientCode} - {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="w-40">
                  <label className="text-xs font-semibold text-text-secondary block mb-1">
                    Invoice Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="PAID">Paid</option>
                    <option value="PARTIALLY_PAID">Partially Paid</option>
                    <option value="PENDING">Pending</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="py-1 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="py-1 text-xs"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPatientId('');
                  setSelectedStatus('');
                  setStartDate('2026-01-01');
                  setEndDate('2026-12-31');
                }}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-text-secondary animate-pulse">
                  Loading clinical billing records...
                </div>
              ) : invoiceList.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-secondary">
                  No invoices found matching selected filter criteria.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                    <tr>
                      <th className="p-3.5">Invoice Code</th>
                      <th className="p-3.5">Patient</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-right">Total (₹)</th>
                      <th className="p-3.5 text-right">Paid (₹)</th>
                      <th className="p-3.5 text-right">Due (₹)</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {invoiceList.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3.5 font-bold text-primary">{inv.invoiceCode}</td>
                        <td className="p-3.5">
                          <p className="font-semibold text-text-main">
                            {inv.patient?.firstName} {inv.patient?.lastName}
                          </p>
                          <p className="text-[11px] text-text-secondary">{inv.patient?.patientCode}</p>
                        </td>
                        <td className="p-3.5">{inv.createdAt?.split('T')[0]}</td>
                        <td className="p-3.5 text-right font-bold text-text-main">
                          ₹{Number(inv.totalAmount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-emerald-700">
                          ₹{Number(inv.paidAmount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-bold text-red-600">
                          ₹{Number(inv.dueAmount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">{getStatusBadge(inv.status)}</td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoiceId(inv.id);
                                setIsDetailOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs rounded-lg border border-primary/30 text-primary hover:bg-primary-50 font-semibold"
                            >
                              Inspect / Collect
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Modals */}
          <CreateInvoiceModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onSuccess={(createdInvoice) => {
              fetchInvoices();
              if (createdInvoice?.id) {
                setSelectedInvoiceId(createdInvoice.id);
                setIsDetailOpen(true);
              }
            }}
          />

          <InvoiceDetailModal
            invoiceId={selectedInvoiceId}
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            onRefresh={fetchInvoices}
          />
    </div>
  );
}
