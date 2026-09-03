'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Bell,
  Search,
  CheckCircle,
  AlertCircle,
  Mail,
  MessageSquare,
  RefreshCw,
  Clock,
  FileText,
  Filter,
} from 'lucide-react';

export default function NotificationsLogPage() {
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningReminders, setIsRunningReminders] = useState(false);

  // Error Detail Modal
  const [selectedErrorNotif, setSelectedErrorNotif] = useState<any>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/notifications', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          channel: channelFilter || undefined,
          limit: 100,
        },
      });
      const rawNotifs = res?.data?.data ?? res?.data;
      setNotifications(Array.isArray(rawNotifs) ? rawNotifs : (Array.isArray(rawNotifs?.items) ? rawNotifs.items : []));
    } catch (err: any) {
      showToast('Failed to load notification log', 'error');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, typeFilter, channelFilter, showToast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRunReminders = async () => {
    setIsRunningReminders(true);
    try {
      const res = await api.post('/notifications/run-reminders');
      showToast(res.data.message || 'Reminders job executed', 'success');
      fetchNotifications();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to run reminders job', 'error');
    } finally {
      setIsRunningReminders(false);
    }
  };

  const notifList = Array.isArray(notifications) ? notifications : [];
  const totalCount = notifList.length;
  const sentCount = notifList.filter((n) => n.status === 'SENT').length;
  const failedCount = notifList.filter((n) => n.status === 'FAILED').length;
  const deliverabilityRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-main">Notification Audit Log</h1>
            <Badge variant="accent" size="sm">Admin Control</Badge>
          </div>
          <p className="text-xs text-text-secondary">
            Audit all outgoing patient communications, email delivery logs, WhatsApp attempts, and automated appointment reminders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Log
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunReminders}
            isLoading={isRunningReminders}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            Trigger 24h Reminders Dispatch
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary">Total Communications</p>
              <p className="text-2xl font-bold text-primary mt-1">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary">Delivered Successfully</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{sentCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={failedCount > 0 ? 'border-red-300 bg-red-50/50' : ''}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-800">Delivery Failures</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{failedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary">Deliverability Rate</p>
              <p className="text-2xl font-bold text-primary mt-1">{deliverabilityRate}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent flex items-center justify-center font-bold text-xs">
              SLAs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
            <Input
              type="text"
              placeholder="Search recipient email, phone, or message body..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
            >
              <option value="">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
            >
              <option value="">All Notification Types</option>
              <option value="INVOICE_SENT">Invoice Delivery</option>
              <option value="PRESCRIPTION_SENT">Digital Rx Delivery</option>
              <option value="APPOINTMENT_REMINDER">24h OPD Reminder</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-surface-border bg-white px-3 text-xs focus:border-primary focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setChannelFilter('');
                setTypeFilter('');
                setStatusFilter('');
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-text-secondary animate-pulse">
              Loading notification logs...
            </div>
          ) : notifList.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary">
              No notifications matching current filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Channel</th>
                  <th className="p-3.5">Notification Type</th>
                  <th className="p-3.5">Recipient</th>
                  <th className="p-3.5">Subject / Content Preview</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {notifList.map((n) => {
                  const isSent = n.status === 'SENT';
                  const isFailed = n.status === 'FAILED';

                  return (
                    <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3.5 font-medium text-text-secondary whitespace-nowrap">
                        {n.createdAt?.replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="p-3.5">
                        <span className="flex items-center gap-1.5 font-semibold">
                          {n.channel === 'EMAIL' ? (
                            <Mail className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          {n.channel}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-50 text-primary">
                          {n.type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] font-semibold text-text-main">
                        {n.recipient}
                      </td>
                      <td className="p-3.5 max-w-xs truncate text-text-secondary">
                        <span className="font-semibold text-text-main block truncate">
                          {n.subject || 'Ewa Derma Clinic Notification'}
                        </span>
                        <span className="text-[11px] text-text-secondary truncate block">
                          {n.content}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isSent && (
                          <Badge variant="success" size="sm" dot>
                            Delivered
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge variant="danger" size="sm" dot>
                            Failed
                          </Badge>
                        )}
                        {!isSent && !isFailed && (
                          <Badge variant="warning" size="sm" dot>
                            {n.status}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedErrorNotif(n)}
                          className="p-1.5 rounded-lg text-primary hover:bg-primary-50 font-semibold cursor-pointer"
                          title="View message & error audit log"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Audit Detail Modal */}
      {selectedErrorNotif && (
        <Modal
          isOpen={Boolean(selectedErrorNotif)}
          onClose={() => setSelectedErrorNotif(null)}
          title={`Notification Dispatch Details — ${selectedErrorNotif.type}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-text-main">
            <div className="p-3 rounded-xl bg-gray-50 border border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Delivery Status:</span>
                <Badge
                  variant={
                    selectedErrorNotif.status === 'SENT'
                      ? 'success'
                      : selectedErrorNotif.status === 'FAILED'
                      ? 'danger'
                      : 'warning'
                  }
                  size="sm"
                >
                  {selectedErrorNotif.status}
                </Badge>
              </div>

              {selectedErrorNotif.errorLog && (
                <div>
                  <span className="text-red-700 font-semibold block mb-1">Error Diagnostic Log:</span>
                  <p className="p-2 rounded bg-red-50 text-red-700 font-mono text-[11px] border border-red-200">
                    {selectedErrorNotif.errorLog}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-secondary block">Channel:</span>
                <strong>{selectedErrorNotif.channel}</strong>
              </div>
              <div>
                <span className="text-text-secondary block">Recipient:</span>
                <strong>{selectedErrorNotif.recipient}</strong>
              </div>
              <div>
                <span className="text-text-secondary block">Timestamp:</span>
                <strong>{selectedErrorNotif.createdAt?.replace('T', ' ').substring(0, 19)}</strong>
              </div>
            </div>

            <div>
              <span className="text-text-secondary block mb-1 font-semibold">Message Content Template:</span>
              <div className="p-3 rounded-xl bg-surface-ground font-mono text-[11px] whitespace-pre-wrap text-text-main border border-surface-border">
                {selectedErrorNotif.content}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedErrorNotif(null)}>
                Close Audit Log
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
