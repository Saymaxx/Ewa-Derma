'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import {
  FileText,
  CreditCard,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  IndianRupee,
  Mail,
  MessageSquare,
} from 'lucide-react';

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function InvoiceDetailModal({
  invoiceId,
  isOpen,
  onClose,
  onRefresh,
}: InvoiceDetailModalProps) {
  const { showToast } = useToast();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['ADMIN']);

  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('UPI');
  const [payRefId, setPayRefId] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Refund Form State
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [selectedPayId, setSelectedPayId] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Notifications State
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadInvoiceDetails();
      loadNotifHistory();
    }
  }, [isOpen, invoiceId]);

  const loadNotifHistory = async () => {
    if (!invoiceId) return;
    try {
      const res = await api.get(`/notifications/history/INVOICE/${invoiceId}`);
      setNotifHistory(res.data.data || []);
    } catch {
      // Ignore
    }
  };

  const handleSendEmail = async () => {
    if (!invoiceId) return;
    setIsSendingEmail(true);
    try {
      const res = await api.post(`/notifications/send-invoice/${invoiceId}`, { channel: 'EMAIL' });
      showToast(res.data.message || 'Invoice sent via email', 'success');
      loadNotifHistory();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to send email', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!invoiceId) return;
    setIsSendingWA(true);
    try {
      const res = await api.post(`/notifications/send-invoice/${invoiceId}`, { channel: 'WHATSAPP' });
      if (res.data.data?.status === 'FAILED') {
        showToast(res.data.data.errorLog || 'WhatsApp is not connected yet', 'error');
      } else {
        showToast(res.data.message || 'Invoice sent via WhatsApp', 'success');
      }
      loadNotifHistory();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || err.response?.data?.message || 'WhatsApp is not connected yet', 'error');
    } finally {
      setIsSendingWA(false);
    }
  };

  const loadInvoiceDetails = async () => {
    if (!invoiceId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      const inv = res.data.data;
      setInvoice(inv);
      setPayAmount(Number(inv.dueAmount));
    } catch (err: any) {
      showToast('Failed to load invoice details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoiceId) return;
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoice?.invoiceCode || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Invoice PDF downloaded', 'success');
    } catch (err) {
      showToast('Failed to download invoice PDF', 'error');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;
    if (payAmount <= 0) {
      showToast('Payment amount must be greater than zero', 'error');
      return;
    }

    setIsSubmittingPay(true);
    try {
      await api.post('/payments', {
        invoiceId,
        amount: payAmount,
        paymentMethod: payMethod,
        referenceId: payRefId,
        notes: payNotes,
      });

      showToast('Payment recorded successfully', 'success');
      setShowPaymentForm(false);
      loadInvoiceDetails();
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to record payment', 'error');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleIssueRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayId) return;
    if (refundAmount <= 0) {
      showToast('Refund amount must be greater than zero', 'error');
      return;
    }
    if (!refundReason.trim()) {
      showToast('Refund reason is required', 'error');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      await api.post('/refunds', {
        paymentId: selectedPayId,
        amount: refundAmount,
        reason: refundReason,
      });

      showToast('Refund issued successfully', 'success');
      setShowRefundForm(false);
      loadInvoiceDetails();
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to issue refund', 'error');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  if (!isOpen || !invoice) return null;

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
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice Detail - ${invoice.invoiceCode}`} maxWidth="xl">
      <div className="space-y-6 text-text-main">
        {/* Header Summary Bar */}
        <div className="p-4 bg-surface rounded-2xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">{invoice.invoiceCode}</span>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-xs text-text-secondary flex items-center gap-3">
              <span>Patient: <strong className="text-text-main">{invoice.patient?.firstName} {invoice.patient?.lastName} ({invoice.patient?.patientCode})</strong></span>
              <span>• Phone: {invoice.patient?.phone}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              isLoading={isSendingEmail}
              leftIcon={<Mail className="w-4 h-4 text-primary" />}
            >
              Send Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendWhatsApp}
              isLoading={isSendingWA}
              leftIcon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
            >
              Send WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              leftIcon={<FileText className="w-4 h-4 text-primary" />}
            >
              PDF
            </Button>
            {invoice.dueAmount > 0 && invoice.status !== 'CANCELLED' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowPaymentForm(true);
                  setShowRefundForm(false);
                }}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* Quick Payment Collection Drawer / Form */}
        {showPaymentForm && (
          <form onSubmit={handleRecordPayment} className="p-4 bg-primary-50 rounded-2xl border border-primary/20 space-y-4 animate-in fade-in">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Collect Payment against {invoice.invoiceCode}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  max={invoice.dueAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
                  required
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Reference ID / Txn No.
                </label>
                <Input
                  type="text"
                  value={payRefId}
                  onChange={(e) => setPayRefId(e.target.value)}
                  placeholder="e.g. UPI txn ref number"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowPaymentForm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" isLoading={isSubmittingPay}>
                Submit Payment
              </Button>
            </div>
          </form>
        )}

        {/* Refund Form (Admin Only) */}
        {showRefundForm && isAdmin && (
          <form onSubmit={handleIssueRefund} className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-4 animate-in fade-in">
            <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Issue Admin Refund
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-red-800 block mb-1">
                  Refund Amount (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="text-xs border-red-300"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-red-800 block mb-1">
                  Refund Reason <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Patient requested cancellation"
                  className="text-xs border-red-300"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowRefundForm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" type="submit" isLoading={isSubmittingRefund}>
                Confirm Refund
              </Button>
            </div>
          </form>
        )}

        {/* Line Items Table */}
        <div>
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
            Line Items
          </h4>
          <div className="border border-surface-border rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {invoice.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-primary">
                        {item.itemType}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-text-main">{item.description}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                    <td className="p-3 text-right">₹{Number(item.discount).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold">₹{Number(item.totalPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end">
          <div className="w-full md:w-72 bg-surface p-3.5 rounded-xl border border-surface-border text-xs space-y-1.5">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal:</span>
              <span className="font-semibold text-text-main">₹{Number(invoice.subTotal).toFixed(2)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({invoice.discountReason || 'Applied'}):</span>
                <span className="font-semibold">- ₹{Number(invoice.discountAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-text-secondary">
              <span>Tax ({invoice.taxRate}%):</span>
              <span>₹{Number(invoice.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-primary pt-1 border-t border-surface-border">
              <span>Total Amount:</span>
              <span>₹{Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-700 font-semibold">
              <span>Total Paid:</span>
              <span>₹{Number(invoice.paidAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-red-600 font-bold">
              <span>Balance Due:</span>
              <span>₹{Number(invoice.dueAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment & Refund History */}
        <div>
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
            Payment & Refund History
          </h4>
          {invoice.payments?.length === 0 ? (
            <p className="text-xs text-text-secondary italic">No payments recorded yet.</p>
          ) : (
            <div className="border border-surface-border rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Method</th>
                    <th className="p-2.5">Amount</th>
                    <th className="p-2.5">Reference ID</th>
                    <th className="p-2.5">Recorded By</th>
                    {isAdmin && <th className="p-2.5 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {invoice.payments?.map((p: any) => (
                    <tr key={p.id}>
                      <td className="p-2.5">{p.createdAt?.split('T')[0]}</td>
                      <td className="p-2.5 font-semibold text-primary">{p.paymentMethod}</td>
                      <td className="p-2.5 font-bold text-emerald-700">₹{Number(p.amount).toFixed(2)}</td>
                      <td className="p-2.5 font-mono text-[11px]">{p.referenceId || 'N/A'}</td>
                      <td className="p-2.5">{p.recordedBy?.firstName || 'System'}</td>
                      {isAdmin && (
                        <td className="p-2.5 text-center">
                          {!p.isRefunded && invoice.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayId(p.id);
                                setRefundAmount(Number(p.amount));
                                setShowRefundForm(true);
                                setShowPaymentForm(false);
                              }}
                              className="text-xs text-red-600 hover:underline font-semibold"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notification Send History */}
        {notifHistory.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              Notification Dispatch History ({notifHistory.length})
            </h4>
            <div className="border border-surface-border rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                  <tr>
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">Channel</th>
                    <th className="p-2.5">Recipient</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Details / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {notifHistory.map((nh: any) => (
                    <tr key={nh.id}>
                      <td className="p-2.5 text-text-secondary">{nh.createdAt?.replace('T', ' ').substring(0, 16)}</td>
                      <td className="p-2.5 font-bold text-primary">{nh.channel}</td>
                      <td className="p-2.5 font-medium text-text-main">{nh.recipient}</td>
                      <td className="p-2.5 text-center">
                        <Badge
                          variant={nh.status === 'SENT' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {nh.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-text-secondary text-[11px]">
                        {nh.status === 'SENT' ? 'Delivered PDF' : nh.errorLog}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
