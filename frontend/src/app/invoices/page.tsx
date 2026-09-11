'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import CreateInvoiceModal from '@/components/billing/CreateInvoiceModal';
import InvoiceDetailModal from '@/components/billing/InvoiceDetailModal';
import { TableSkeleton } from '@/components/ui/Skeleton';
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
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function InvoicesPage() {
  const { showToast } = useToast();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const [invoices, setInvoices] = useState<any[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Delete State
  const [deleteInvoice, setDeleteInvoice] = useState<any | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleDeleteInvoice = async () => {
    if (!deleteInvoice) return;
    setIsDeleteSubmitting(true);
    try {
      await api.delete(`/invoices/${deleteInvoice.id}`);
      showToast(
        `Invoice ${deleteInvoice.invoiceCode} permanently deleted from database.`,
        'success',
        'Invoice Deleted',
      );
      setDeleteInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete invoice', 'error');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/invoices', {
        params: {
          patientId: selectedPatientId || undefined,
          status: selectedStatus || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit,
        },
      });
      const data = res?.data?.data ?? res?.data;
      if (data && Array.isArray(data.items)) {
        setInvoices(data.items);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else if (Array.isArray(data)) {
        setInvoices(data);
        setTotalCount(data.length);
        setTotalPages(1);
      } else {
        setInvoices([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      showToast('Failed to load invoices list', 'error');
      setInvoices([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPatientId, selectedStatus, startDate, endDate, page, limit, showToast]);

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
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      setPage(1);
                    }}
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
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setPage(1);
                    }}
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
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
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
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
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
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
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
                <div className="p-4">
                  <TableSkeleton rows={6} columns={8} />
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
                              className="min-h-[36px] px-3 py-1.5 text-xs rounded-lg border border-primary/30 text-primary hover:bg-primary-50 active:bg-primary-100 font-semibold transition-colors"
                            >
                              Inspect / Collect
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                title="Permanently Delete Invoice"
                                onClick={() => setDeleteInvoice(inv)}
                                className="min-h-[36px] min-w-[36px] px-2 flex items-center justify-center rounded-lg border border-red-200 text-status-danger hover:bg-status-danger/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>

            {/* Pagination Footer */}
            {!isLoading && invoiceList.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-border bg-surface/30 text-xs text-text-secondary">
                <div>
                  Showing <span className="font-semibold">{invoiceList.length}</span> of{' '}
                  <span className="font-semibold">{totalCount}</span> invoices
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="min-w-[40px] min-h-[40px] p-2 flex items-center justify-center"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="font-medium px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="min-w-[40px] min-h-[40px] p-2 flex items-center justify-center"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
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

          {/* Permanent Delete Invoice Modal */}
          <Modal
            isOpen={!!deleteInvoice}
            onClose={() => setDeleteInvoice(null)}
            title="Permanently Delete Invoice"
            description="Are you sure you want to permanently erase this invoice record?"
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
                <div className="text-xs text-red-800 space-y-1.5">
                  <p className="font-semibold text-red-900">
                    Delete Invoice: {deleteInvoice?.invoiceCode} — {deleteInvoice?.patient?.firstName} {deleteInvoice?.patient?.lastName}
                  </p>
                  <p>
                    Invoice Total: <strong>₹{Number(deleteInvoice?.totalAmount || 0).toFixed(2)}</strong> ({deleteInvoice?.status})
                  </p>
                  <p>
                    This action is <strong className="text-red-900">irreversible</strong>. The invoice and its associated line items & payment transactions will be completely deleted from the database.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
                <Button type="button" variant="outline" onClick={() => setDeleteInvoice(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600 shadow-sm"
                  isLoading={isDeleteSubmitting}
                  onClick={handleDeleteInvoice}
                >
                  Permanently Delete
                </Button>
              </div>
            </div>
          </Modal>
    </div>
  );
}
