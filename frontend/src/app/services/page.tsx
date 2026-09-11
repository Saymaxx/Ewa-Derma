'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  Sparkles,
  Search,
  Plus,
  PlusCircle,
  Edit2,
  Trash2,
  FileText,
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Procedure',
  'Medi-Facial',
  'Laser',
  'Hair Care',
  'Injectable',
  'Chemical Peel',
  'Consultation',
  'Surgery / Minor OT',
  'Other',
];

export default function ServicesPage() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const isAdmin = hasRole('ADMIN');

  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Add Service State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    category: 'Procedure',
    customCategory: '',
    description: '',
    basePrice: 1500,
    taxRate: 0,
  });

  // Edit Service State
  const [editService, setEditService] = useState<any | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Procedure',
    customCategory: '',
    description: '',
    basePrice: 1500,
    taxRate: 0,
    isActive: true,
  });

  // Delete Service State
  const [deleteService, setDeleteService] = useState<any | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/services', { params: { all: 'true' } });
      const data = res.data?.data || res.data;
      setServices(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load services catalog', 'error');
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      showToast('Service name is required', 'warning');
      return;
    }

    const finalCategory =
      addForm.category === '__CUSTOM__'
        ? addForm.customCategory.trim() || 'Procedure'
        : addForm.category.trim() || 'Procedure';

    setIsAddSubmitting(true);
    try {
      await api.post('/services', {
        name: addForm.name.trim(),
        category: finalCategory,
        description: addForm.description.trim() || undefined,
        basePrice: Number(addForm.basePrice) || 0,
        taxRate: Number(addForm.taxRate) || 0,
      });

      showToast(`Service '${addForm.name}' created successfully`, 'success', 'Service Added');
      setIsAddOpen(false);
      setAddForm({
        name: '',
        category: 'Procedure',
        customCategory: '',
        description: '',
        basePrice: 1500,
        taxRate: 0,
      });
      fetchServices();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Creation Failed');
    } finally {
      setIsAddSubmitting(false);
    }
  };

  const openEditModal = (svc: any) => {
    setEditService(svc);
    setEditForm({
      name: svc.name || '',
      category: svc.category || 'Procedure',
      customCategory: '',
      description: svc.description || '',
      basePrice: Number(svc.basePrice) || 0,
      taxRate: Number(svc.taxRate) || 0,
      isActive: svc.isActive !== false,
    });
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editService) return;

    if (!editForm.name.trim()) {
      showToast('Service name is required', 'warning');
      return;
    }

    const finalCategory =
      editForm.category === '__CUSTOM__'
        ? editForm.customCategory.trim() || 'Procedure'
        : editForm.category.trim() || 'Procedure';

    setIsEditSubmitting(true);
    try {
      await api.patch(`/services/${editService.id}`, {
        name: editForm.name.trim(),
        category: finalCategory,
        description: editForm.description.trim() || undefined,
        basePrice: Number(editForm.basePrice) || 0,
        taxRate: Number(editForm.taxRate) || 0,
        isActive: editForm.isActive,
      });

      showToast(`Service updated successfully`, 'success', 'Service Updated');
      setEditService(null);
      fetchServices();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Update Failed');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deleteService) return;
    setIsDeleteSubmitting(true);
    try {
      await api.delete(`/services/${deleteService.id}`);
      showToast(`Service '${deleteService.name}' deactivated`, 'success', 'Service Deactivated');
      setDeleteService(null);
      fetchServices();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Deactivation Failed');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const dynamicCategories = useMemo(() => {
    const categoriesSet = new Set<string>(['All', ...DEFAULT_CATEGORIES]);
    services.forEach((s) => {
      if (s.category && s.category.trim()) {
        categoriesSet.add(s.category.trim());
      }
    });
    return Array.from(categoriesSet);
  }, [services]);

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || s.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Procedures & Services Catalog
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Manage clinical treatments, skin procedures, laser sessions, and baseline billable fees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="primary" size="md">
            {services.length} Services
          </Badge>
          {isAdmin && (
            <>
              <Link href="/services/new">
                <Button
                  variant="primary"
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Add New Service
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:max-w-md">
              <Input
                placeholder="Search procedures (e.g. Chemical Peel, HydraFacial)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-text-muted" />}
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0">
              {dynamicCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface hover:bg-surface-border/50 text-text-secondary border border-surface-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Treatments & Pricing Master</CardTitle>
          <span className="text-xs text-text-muted">
            {isLoading ? 'Loading catalog...' : `Showing ${filteredServices.length} items`}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={5} />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-text-muted mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-primary">No services found</p>
                <p className="text-xs text-text-secondary">
                  {search ? `No treatments matching "${search}"` : 'Get started by adding your clinic procedures.'}
                </p>
              </div>
              {isAdmin && (
                <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)}>
                  Add First Service
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treatment / Service Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Base Price (₹)</TableHead>
                  <TableHead>Tax Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((svc) => (
                  <TableRow key={svc.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-text-primary block">
                          {svc.name}
                        </span>
                        {svc.description && (
                          <span className="text-xs text-text-muted block line-clamp-1">
                            {svc.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="default" size="sm">
                        {svc.category || 'General'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono font-bold text-primary text-sm">
                        ₹{Number(svc.basePrice).toLocaleString('en-IN')}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-text-secondary">
                      {svc.taxRate ? `${svc.taxRate}% GST` : '0% (Exempt)'}
                    </TableCell>

                    <TableCell>
                      <Badge variant={svc.isActive ? 'success' : 'default'} size="sm" dot>
                        {svc.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            onClick={() => openEditModal(svc)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-status-danger hover:bg-status-danger/10"
                            leftIcon={<Trash2 className="w-3.5 h-3.5 text-status-danger" />}
                            onClick={() => setDeleteService(svc)}
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

      {/* Add Service Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Procedure / Service"
        description="Register a treatment, consultation type, or aesthetic procedure."
        maxWidth="md"
      >
        <form onSubmit={handleAddService} className="space-y-4">
          <Input
            label="Service / Procedure Name"
            placeholder="e.g. Salicylic Acid Chemical Peel"
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
              Category
            </label>
            <div className={addForm.category === '__CUSTOM__' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : ''}>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__CUSTOM__">+ Custom Category...</option>
              </select>

              {addForm.category === '__CUSTOM__' && (
                <Input
                  placeholder="Enter Custom Category (e.g. Thread Lift)"
                  value={addForm.customCategory}
                  onChange={(e) => setAddForm({ ...addForm, customCategory: e.target.value })}
                  autoFocus
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Base Price (₹)"
              type="number"
              min={0}
              placeholder="1500"
              value={addForm.basePrice}
              onChange={(e) => setAddForm({ ...addForm, basePrice: Number(e.target.value) })}
              required
            />

            <Input
              label="GST Tax Rate (%)"
              type="number"
              min={0}
              max={28}
              placeholder="0 or 18"
              value={addForm.taxRate}
              onChange={(e) => setAddForm({ ...addForm, taxRate: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Description / Clinical Notes"
            placeholder="Brief explanation of procedure steps or indications"
            value={addForm.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAddSubmitting}>
              Add Service
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Service Modal */}
      <Modal
        isOpen={!!editService}
        onClose={() => setEditService(null)}
        title={`Edit Service — ${editService?.name}`}
        description="Update pricing, tax rate, and active catalog status."
        maxWidth="md"
      >
        <form onSubmit={handleUpdateService} className="space-y-4">
          <Input
            label="Service / Procedure Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
              Category
            </label>
            <div className={editForm.category === '__CUSTOM__' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : ''}>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__CUSTOM__">+ Custom Category...</option>
              </select>

              {editForm.category === '__CUSTOM__' && (
                <Input
                  placeholder="Enter Custom Category (e.g. Thread Lift)"
                  value={editForm.customCategory}
                  onChange={(e) => setEditForm({ ...editForm, customCategory: e.target.value })}
                  autoFocus
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Base Price (₹)"
              type="number"
              min={0}
              value={editForm.basePrice}
              onChange={(e) => setEditForm({ ...editForm, basePrice: Number(e.target.value) })}
              required
            />

            <Input
              label="GST Tax Rate (%)"
              type="number"
              min={0}
              max={28}
              value={editForm.taxRate}
              onChange={(e) => setEditForm({ ...editForm, taxRate: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
              Catalog Status
            </label>
            <select
              className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={editForm.isActive ? 'true' : 'false'}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
            >
              <option value="true">Active (Bookable & Billable)</option>
              <option value="false">Inactive / Discontinued</option>
            </select>
          </div>

          <Input
            label="Description / Clinical Notes"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setEditService(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isEditSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Service Modal */}
      <Modal
        isOpen={!!deleteService}
        onClose={() => setDeleteService(null)}
        title="Confirm Service Deactivation"
        description="Are you sure you want to deactivate this service from the catalog?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <div className="text-xs text-red-800 space-y-1">
              <p className="font-semibold">
                Deactivating {deleteService?.name} (₹{deleteService?.basePrice})
              </p>
              <p>
                This will prevent new appointment bookings and fast-track procedure logging for this service, while preserving historical invoices and patient treatment records.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setDeleteService(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              isLoading={isDeleteSubmitting}
              onClick={handleDeleteService}
            >
              Confirm Deactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
