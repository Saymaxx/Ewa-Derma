'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Clock,
  User,
  Globe,
  FileCode,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity,
} from 'lucide-react';

export default function AuditLogsPage() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/audit-logs', {
        params: {
          page,
          limit,
          search: search.trim() || undefined,
          action: actionFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });

      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setLogs(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err: any) {
      showToast('Failed to load system audit logs', 'error');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, actionFilter, startDate, endDate, showToast]);

  useEffect(() => {
    if (hasRole('ADMIN')) {
      fetchLogs();
    } else {
      setIsLoading(false);
    }
  }, [hasRole, fetchLogs]);

  if (!hasRole('ADMIN')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Access Restricted</h2>
        <p className="text-sm text-text-muted mt-2 max-w-md">
          Only administrators with the <Badge variant="accent">ADMIN</Badge> role are authorized to view security and audit logs.
        </p>
      </div>
    );
  }

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('FAIL') || action.includes('REVOKE') || action.includes('DELETE') || action.includes('CANCEL')) {
      return 'danger';
    }
    if (action.includes('LOGIN') || action.includes('SUCCESS') || action.includes('CREATE')) {
      return 'success';
    }
    if (action.includes('UPDATE') || action.includes('PATCH') || action.includes('STATUS')) {
      return 'primary';
    }
    return 'default';
  };

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-primary">System Audit Logs</h1>
            <Badge variant="accent" size="sm">
              Admin Compliance
            </Badge>
          </div>
          <p className="text-xs text-text-secondary">
            Immutable log of all user logins, state transitions, clinic modifications, and sensitive actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Logs
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                Search
              </label>
              <Input
                placeholder="User, action, entity, IP..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-4 h-4 text-text-muted" />}
              />
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Actions</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="PATCH">PATCH / UPDATE</option>
                <option value="POST">POST / CREATE</option>
                <option value="DELETE">DELETE</option>
                <option value="STATUS">STATUS CHANGE</option>
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                From Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                To Date
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                />
                {(search || actionFilter || startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={6} />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-12 text-text-muted">
              <ShieldCheck className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
              <p className="text-base font-semibold">No audit logs found</p>
              <p className="text-xs mt-1">Try adjusting your filters or search criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Timestamp</TableHead>
                  <TableHead className="w-52">Acting User</TableHead>
                  <TableHead className="w-44">Action</TableHead>
                  <TableHead>Target Entity</TableHead>
                  <TableHead className="w-36">IP Address</TableHead>
                  <TableHead className="w-24 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const dateStr = new Date(log.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-text-muted font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-text-muted/70 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-text-primary">
                              {log.user.firstName} {log.user.lastName}
                            </span>
                            <span className="text-[11px] text-text-muted">{log.user.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">System / Anonymous</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action) as any} size="sm">
                          {log.action}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-text-primary">
                            {log.entityName || '—'}
                          </span>
                          {log.entityId && (
                            <span className="text-[10px] text-text-muted font-mono truncate max-w-[200px]" title={log.entityId}>
                              ID: {log.entityId}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-text-muted font-mono whitespace-nowrap">
                        {log.ipAddress || '—'}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="min-h-[36px] text-xs text-primary hover:bg-primary-50 px-3 py-1.5"
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {!isLoading && logs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-border bg-surface/30 text-xs text-text-secondary">
              <div>
                Showing <span className="font-semibold">{logs.length}</span> of{' '}
                <span className="font-semibold">{total}</span> events
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
        </CardContent>
      </Card>

      {/* Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Payload Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface text-xs">
              <div>
                <span className="text-text-muted block">Action</span>
                <span className="font-bold text-text-primary">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-text-muted block">Timestamp</span>
                <span className="font-medium text-text-primary">
                  {new Date(selectedLog.createdAt).toISOString()}
                </span>
              </div>
              <div>
                <span className="text-text-muted block">User</span>
                <span className="font-medium text-text-primary">
                  {selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName} (${selectedLog.user.email})` : 'System'}
                </span>
              </div>
              <div>
                <span className="text-text-muted block">Client IP</span>
                <span className="font-mono text-text-primary">{selectedLog.ipAddress || 'Unknown'}</span>
              </div>
            </div>

            {selectedLog.userAgent && (
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  User Agent
                </label>
                <p className="text-xs font-mono text-text-muted bg-surface p-2 rounded border border-surface-border break-all">
                  {selectedLog.userAgent}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Context & Details Payload
              </label>
              <pre className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto max-h-64">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
