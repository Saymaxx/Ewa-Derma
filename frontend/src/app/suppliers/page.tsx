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
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Building,
  FileText,
  AlertTriangle,
  Package,
} from 'lucide-react';

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const isManager = hasRole(['ADMIN', 'INVENTORY_MANAGER']);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Supplier State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
  });

  // Edit Supplier State
  const [editSupplier, setEditSupplier] = useState<any | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    isActive: true,
  });

  // Deactivate Supplier State
  const [deleteSupplier, setDeleteSupplier] = useState<any | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/suppliers', { params: { search: search || undefined } });
      const data = res.data?.data || res.data;
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load suppliers directory', 'error');
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      showToast('Supplier name and phone are required', 'warning');
      return;
    }

    setIsAddSubmitting(true);
    try {
      await api.post('/suppliers', {
        name: addForm.name.trim(),
        contactPerson: addForm.contactPerson.trim() || undefined,
        phone: addForm.phone.trim(),
        email: addForm.email.toLowerCase().trim() || undefined,
        gstin: addForm.gstin.trim() || undefined,
        address: addForm.address.trim() || undefined,
      });

      showToast(`Supplier '${addForm.name}' created successfully`, 'success', 'Supplier Added');
      setIsAddOpen(false);
      setAddForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        address: '',
      });
      fetchSuppliers();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Creation Failed');
    } finally {
      setIsAddSubmitting(false);
    }
  };

  const openEditModal = (sup: any) => {
    setEditSupplier(sup);
    setEditForm({
      name: sup.name || '',
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      gstin: sup.gstin || '',
      address: sup.address || '',
      isActive: sup.isActive !== false,
    });
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupplier) return;

    if (!editForm.name.trim() || !editForm.phone.trim()) {
      showToast('Supplier name and phone are required', 'warning');
      return;
    }

    setIsEditSubmitting(true);
    try {
      await api.patch(`/suppliers/${editSupplier.id}`, {
        name: editForm.name.trim(),
        contactPerson: editForm.contactPerson.trim() || null,
        phone: editForm.phone.trim(),
        email: editForm.email.toLowerCase().trim() || null,
        gstin: editForm.gstin.trim() || null,
        address: editForm.address.trim() || null,
        isActive: editForm.isActive,
      });

      showToast(`Supplier updated successfully`, 'success', 'Supplier Updated');
      setEditSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Update Failed');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deleteSupplier) return;
    setIsDeleteSubmitting(true);
    try {
      await api.delete(`/suppliers/${deleteSupplier.id}`);
      showToast(`Supplier '${deleteSupplier.name}' deactivated.`, 'success', 'Supplier Deactivated');
      setDeleteSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Deactivation Failed');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Suppliers & Vendors Master
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Manage pharmaceutical distributors, cosmeceutical vendors, GSTIN credentials, and contact persons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="primary" size="md">
            {suppliers.length} Vendors
          </Badge>
          {isManager && (
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddOpen(true)}
            >
              Add New Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search by vendor name, contact person, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Directory</CardTitle>
          <span className="text-xs text-text-muted">
            {isLoading ? 'Loading suppliers...' : `Showing ${suppliers.length} vendors`}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={6} />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-text-muted mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-primary">No suppliers found</p>
                <p className="text-xs text-text-secondary">
                  {search ? `No vendors matching "${search}"` : 'Get started by onboarding a new pharmaceutical vendor.'}
                </p>
              </div>
              {isManager && (
                <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)}>
                  Add Supplier
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor / Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone / Mobile</TableHead>
                  <TableHead>GSTIN / Tax ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((sup) => (
                  <TableRow key={sup.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-text-primary block">
                          {sup.name}
                        </span>
                        {sup.email && (
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {sup.email}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-text-secondary">
                      {sup.contactPerson || '—'}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-text-secondary">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-text-muted" />
                        {sup.phone}
                      </span>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-text-secondary">
                      {sup.gstin || 'Unregistered'}
                    </TableCell>

                    <TableCell>
                      <Badge variant={sup.isActive ? 'success' : 'default'} size="sm" dot>
                        {sup.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {isManager && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            onClick={() => openEditModal(sup)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-status-danger hover:bg-status-danger/10"
                            leftIcon={<Trash2 className="w-3.5 h-3.5 text-status-danger" />}
                            onClick={() => setDeleteSupplier(sup)}
                          >
                            Deactivate
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Vendor / Supplier"
        description="Register a medicine or cosmetic supplier company profile."
        maxWidth="md"
      >
        <form onSubmit={handleAddSupplier} className="space-y-4">
          <Input
            label="Vendor / Company Name"
            placeholder="e.g. Cipla Healthcare Dist."
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person Name"
              placeholder="e.g. Manish Sharma"
              value={addForm.contactPerson}
              onChange={(e) => setAddForm({ ...addForm, contactPerson: e.target.value })}
            />
            <Input
              label="Primary Phone / Mobile"
              placeholder="+91 98765 43210"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="sales@vendor.com"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            />
            <Input
              label="GSTIN Number"
              placeholder="e.g. 09AAAAA0000A1Z5"
              value={addForm.gstin}
              onChange={(e) => setAddForm({ ...addForm, gstin: e.target.value })}
            />
          </div>

          <Input
            label="Warehouse / Office Address"
            placeholder="Street, City, Pin Code"
            value={addForm.address}
            onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAddSubmitting}>
              Add Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={!!editSupplier}
        onClose={() => setEditSupplier(null)}
        title={`Edit Supplier — ${editSupplier?.name}`}
        description="Update vendor contact information and active trading status."
        maxWidth="md"
      >
        <form onSubmit={handleUpdateSupplier} className="space-y-4">
          <Input
            label="Vendor / Company Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person Name"
              value={editForm.contactPerson}
              onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
            />
            <Input
              label="Primary Phone / Mobile"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
            <Input
              label="GSTIN Number"
              value={editForm.gstin}
              onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Warehouse / Office Address"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Vendor Status
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={editForm.isActive ? 'true' : 'false'}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
              >
                <option value="true">Active (Approved for Purchases)</option>
                <option value="false">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setEditSupplier(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isEditSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Supplier Modal */}
      <Modal
        isOpen={!!deleteSupplier}
        onClose={() => setDeleteSupplier(null)}
        title="Confirm Supplier Deactivation"
        description="Are you sure you want to deactivate this vendor?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 space-y-1">
              <p className="font-semibold">
                Deactivating {deleteSupplier?.name}
              </p>
              <p>
                This supplier will no longer appear in purchase entry dropdowns. Past inventory batch records supplied by them will remain completely intact.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setDeleteSupplier(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              isLoading={isDeleteSubmitting}
              onClick={handleDeleteSupplier}
            >
              Confirm Deactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
