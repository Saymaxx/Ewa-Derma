'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  KeyRound,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react';

export default function StaffManagementPage() {
  const { hasRole, user: currentUser } = useAuth();
  const { showToast } = useToast();
  const isAdmin = hasRole('ADMIN');

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Add Staff State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'RECEPTIONIST',
    password: '',
  });

  // Edit Staff State
  const [editStaff, setEditStaff] = useState<any | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'RECEPTIONIST',
    isActive: true,
  });

  // Reset Password State
  const [resetStaff, setResetStaff] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  // Deactivate Staff State
  const [deleteStaff, setDeleteStaff] = useState<any | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/users');
      const data = res.data?.data || res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load staff accounts', 'error');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.lastName.trim() || !addForm.email.trim()) {
      showToast('First name, last name, and email are required', 'warning');
      return;
    }

    setIsAddSubmitting(true);
    try {
      await api.post('/admin/users', {
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        email: addForm.email.toLowerCase().trim(),
        phone: addForm.phone.trim() || undefined,
        role: addForm.role,
        password: addForm.password.trim() || 'Staff@123',
      });

      showToast(`Staff member ${addForm.firstName} ${addForm.lastName} created.`, 'success', 'Staff Created');
      setIsAddOpen(false);
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'RECEPTIONIST',
        password: '',
      });
      fetchUsers();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Creation Failed');
    } finally {
      setIsAddSubmitting(false);
    }
  };

  const openEditModal = (u: any) => {
    setEditStaff(u);
    const primaryRole = u.userRoles?.[0]?.role?.name || 'RECEPTIONIST';
    setEditForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phone: u.phoneNumber || '',
      role: primaryRole,
      isActive: u.isActive !== false,
    });
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaff) return;

    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      showToast('First name, last name, and email are required', 'warning');
      return;
    }

    setIsEditSubmitting(true);
    try {
      await api.patch(`/admin/users/${editStaff.id}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.toLowerCase().trim(),
        phone: editForm.phone.trim() || undefined,
        role: editForm.role,
        isActive: editForm.isActive,
      });

      showToast('Staff profile and role updated successfully', 'success', 'Profile Updated');
      setEditStaff(null);
      fetchUsers();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Update Failed');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStaff) return;

    setIsResetSubmitting(true);
    try {
      await api.post(`/admin/users/${resetStaff.id}/reset-password`, {
        password: newPassword.trim() || 'Staff@123',
      });
      showToast(`Password reset for ${resetStaff.firstName} ${resetStaff.lastName}.`, 'success', 'Password Reset');
      setResetStaff(null);
      setNewPassword('');
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Reset Failed');
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteStaff) return;
    setIsDeleteSubmitting(true);
    try {
      await api.delete(`/admin/users/${deleteStaff.id}`);
      showToast(`Account for ${deleteStaff.firstName} ${deleteStaff.lastName} has been deactivated.`, 'success', 'Account Deactivated');
      setDeleteStaff(null);
      fetchUsers();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Deactivation Failed');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const phone = (u.phoneNumber || '').toLowerCase();
    const matchesSearch =
      fullName.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase()) ||
      phone.includes(search.toLowerCase());

    const roles = u.userRoles?.map((r: any) => r.role?.name) || [];
    const matchesRole = roleFilter === 'ALL' || roles.includes(roleFilter);

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN':
        return 'danger';
      case 'DOCTOR':
        return 'primary';
      case 'INVENTORY_MANAGER':
        return 'warning';
      case 'RECEPTIONIST':
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Staff & User Access Control
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Manage clinic personnel, assign operational roles, control system access, and reset passwords.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="primary" size="md">
            {users.length} Staff Accounts
          </Badge>
          {isAdmin && (
            <Button
              variant="primary"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsAddOpen(true)}
            >
              Add Staff Member
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search by staff name, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'INVENTORY_MANAGER'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  roleFilter === role
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface hover:bg-surface-border/50 text-text-secondary border border-surface-border'
                }`}
              >
                {role === 'ALL' ? 'All Roles' : role.replace('_', ' ')}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Personnel Directory</CardTitle>
          <span className="text-xs text-text-muted">
            {isLoading ? 'Loading staff...' : `Showing ${filteredUsers.length} accounts`}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={6} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-text-muted mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-primary">No staff members found</p>
                <p className="text-xs text-text-secondary">
                  {search ? `No results matching "${search}"` : 'Get started by creating a new staff account.'}
                </p>
              </div>
              {isAdmin && (
                <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)}>
                  Add Staff Member
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Assigned Roles</TableHead>
                  <TableHead>Contact Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary border border-primary-100 flex items-center justify-center font-bold text-xs shrink-0">
                            {u.firstName?.[0]}
                            {u.lastName?.[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-text-primary block">
                              {u.firstName} {u.lastName}
                              {isSelf && (
                                <span className="ml-1.5 text-[11px] text-primary font-normal">(You)</span>
                              )}
                            </span>
                            <span className="text-xs text-text-muted block">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.userRoles?.map((ur: any) => (
                            <Badge
                              key={ur.role?.id}
                              variant={getRoleBadgeVariant(ur.role?.name)}
                              size="sm"
                            >
                              {ur.role?.name?.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-text-secondary">
                        {u.phoneNumber || '—'}
                      </TableCell>

                      <TableCell>
                        <Badge variant={u.isActive ? 'success' : 'default'} size="sm" dot>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-text-secondary">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </TableCell>

                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                              onClick={() => openEditModal(u)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Reset Password"
                              leftIcon={<KeyRound className="w-3.5 h-3.5 text-amber-600" />}
                              onClick={() => {
                                setResetStaff(u);
                                setNewPassword('');
                              }}
                            >
                              Password
                            </Button>
                            {!isSelf && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-status-danger hover:bg-status-danger/10"
                                leftIcon={<Trash2 className="w-3.5 h-3.5 text-status-danger" />}
                                onClick={() => setDeleteStaff(u)}
                              >
                                Disable
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create New Staff Account"
        description="Register a clinic employee login with role permissions."
        maxWidth="md"
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="e.g. Priya"
              value={addForm.firstName}
              onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Verma"
              value={addForm.lastName}
              onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="priya.verma@ewaderma.com"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              required
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
              Assigned Operational Role
            </label>
            <select
              className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
            >
              <option value="RECEPTIONIST">Receptionist (Bookings, Walk-ins, Invoicing)</option>
              <option value="INVENTORY_MANAGER">Inventory Manager (Stock, Formulary, Purchases)</option>
              <option value="DOCTOR">Doctor (Clinical Consultations, Rx Builder)</option>
              <option value="ADMIN">Administrator (Full Clinic Control)</option>
            </select>
          </div>

          <Input
            label="Initial Password"
            type="password"
            placeholder="Default: Staff@123 (if left blank)"
            value={addForm.password}
            onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAddSubmitting}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={!!editStaff}
        onClose={() => setEditStaff(null)}
        title={`Edit Staff — ${editStaff?.firstName} ${editStaff?.lastName}`}
        description="Update contact details, role assignment, and access state."
        maxWidth="md"
      >
        <form onSubmit={handleUpdateStaff} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={editForm.firstName}
              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={editForm.lastName}
              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
            <Input
              label="Contact Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Role Permission
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="INVENTORY_MANAGER">Inventory Manager</option>
                <option value="DOCTOR">Doctor</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Account Access
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={editForm.isActive ? 'true' : 'false'}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
              >
                <option value="true">Active (Allowed to Login)</option>
                <option value="false">Disabled / Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setEditStaff(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isEditSubmitting}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetStaff}
        onClose={() => setResetStaff(null)}
        title={`Reset Password — ${resetStaff?.firstName} ${resetStaff?.lastName}`}
        description="Set a new secure login password for this employee account."
        maxWidth="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setResetStaff(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isResetSubmitting}>
              Set New Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Staff Modal */}
      <Modal
        isOpen={!!deleteStaff}
        onClose={() => setDeleteStaff(null)}
        title="Confirm Account Deactivation"
        description="Are you sure you want to disable this staff member login?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 space-y-1">
              <p className="font-semibold">
                Deactivating {deleteStaff?.firstName} {deleteStaff?.lastName} ({deleteStaff?.email})
              </p>
              <p>
                This employee will immediately be blocked from logging into the portal. Past receipts and audit logs created by them remain preserved.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setDeleteStaff(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              isLoading={isDeleteSubmitting}
              onClick={handleDeleteStaff}
            >
              Confirm Deactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
