'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { getCachedData, setCachedData, clearCache, CACHE_KEYS, DEFAULT_TTLS } from '@/lib/cache';
import {
  Package,
  PackagePlus,
  Search,
  AlertTriangle,
  Clock,
  TrendingDown,
  Edit2,
  Trash2,
  ShoppingCart,
  Sliders,
  Calendar,
} from 'lucide-react';

export default function MedicinesPage() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const isManager = hasRole(['ADMIN', 'INVENTORY_MANAGER']);

  const [medicines, setMedicines] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Edit Modal State
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    brand: '',
    genericName: '',
    categoryId: '',
    unit: 'Tablet',
    unitPrice: 0,
    purchasePrice: 0,
    mrp: 0,
    minimumStock: 10,
    gstRate: 0,
    isActive: true,
  });

  // Deactivate Modal State
  const [deleteMed, setDeleteMed] = useState<any | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // Fetch Categories
  useEffect(() => {
    api.get('/medicines/categories')
      .then((res) => {
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const fetchMedicines = useCallback(async (forceRefresh = false) => {
    // If no search filter and not forcing refresh, check cache first
    if (!debouncedSearch && !forceRefresh) {
      const cached = getCachedData<any[]>(CACHE_KEYS.MEDICINES_LIST);
      if (cached) {
        setMedicines(cached);
        setIsLoading(false);
        // Still fetch alerts in background
        api.get('/inventory/alerts')
          .then((res) => setAlerts(res?.data?.data || null))
          .catch(() => {});
        return;
      }
    }

    setIsLoading(true);
    try {
      const [medsRes, alertsRes] = await Promise.all([
        api.get('/medicines', { params: { search: debouncedSearch || undefined, limit: 100 } }),
        api.get('/inventory/alerts').catch(() => ({ data: { data: null } })),
      ]);
      const rawMeds = medsRes?.data?.data ?? medsRes?.data;
      const medsList = Array.isArray(rawMeds)
        ? rawMeds
        : Array.isArray(rawMeds?.items)
        ? rawMeds.items
        : [];
      setMedicines(medsList);
      if (!debouncedSearch) {
        setCachedData(CACHE_KEYS.MEDICINES_LIST, medsList, DEFAULT_TTLS.MEDICINES);
      }
      setAlerts(alertsRes?.data?.data || null);
    } catch (err: any) {
      showToast('Failed to load medicines formulary', 'error');
      setMedicines([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, showToast]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const handleOpenEdit = (med: any) => {
    setSelectedMed(med);
    setEditForm({
      name: med.name || '',
      brand: med.brand || '',
      genericName: med.genericName || '',
      categoryId: med.categoryId || '',
      unit: med.unit || 'Tablet',
      unitPrice: Number(med.unitPrice) || 0,
      purchasePrice: Number(med.purchasePrice) || 0,
      mrp: Number(med.mrp) || 0,
      minimumStock: Number(med.minimumStock) || 10,
      gstRate: Number(med.gstRate) || 0,
      isActive: med.isActive !== false,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;

    if (!editForm.name.trim()) {
      showToast('Medicine name is required', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch(`/medicines/${selectedMed.id}`, {
        name: editForm.name.trim(),
        brand: editForm.brand.trim() || undefined,
        genericName: editForm.genericName.trim() || undefined,
        categoryId: editForm.categoryId || undefined,
        unit: editForm.unit,
        unitPrice: Number(editForm.unitPrice) || 0,
        purchasePrice: Number(editForm.purchasePrice) || 0,
        mrp: Number(editForm.mrp) || 0,
        minimumStock: Number(editForm.minimumStock) || 10,
        gstRate: Number(editForm.gstRate) || 0,
        isActive: editForm.isActive,
      });

      showToast('Medicine master details updated successfully', 'success');
      clearCache(CACHE_KEYS.MEDICINES_LIST);
      setIsEditOpen(false);
      fetchMedicines(true);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Update Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMedicine = async () => {
    if (!deleteMed) return;
    setIsDeleteSubmitting(true);
    try {
      await api.delete(`/medicines/${deleteMed.id}`);
      showToast(`Medicine '${deleteMed.name}' deactivated.`, 'success', 'Medicine Deactivated');
      clearCache(CACHE_KEYS.MEDICINES_LIST);
      setDeleteMed(null);
      fetchMedicines(true);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Deactivation Failed');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const medList = Array.isArray(medicines) ? medicines : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-main">Pharmacy & Inventory</h1>
            <Badge variant="accent" size="sm">FEFO Inventory</Badge>
          </div>
          <p className="text-xs text-text-secondary">
            Manage medicine master pricing, purchase receipts, stock transaction ledgers, and FEFO prescription dispensing.
          </p>
        </div>

        {/* Inventory Action & Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/medicines/new">
            <Button variant="primary" size="sm" leftIcon={<PackagePlus className="w-4 h-4" />}>
              Add New Medicine
            </Button>
          </Link>
          <Link href="/inventory/purchases">
            <Button variant="outline" size="sm" leftIcon={<ShoppingCart className="w-4 h-4" />}>
              Purchases (In)
            </Button>
          </Link>
          <Link href="/inventory/adjustments">
            <Button variant="outline" size="sm" leftIcon={<Sliders className="w-4 h-4" />}>
              Adjustments
            </Button>
          </Link>
          <Link href="/inventory/expiry">
            <Button variant="outline" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
              Expiry Tracking
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary">Total Catalog Items</p>
              <p className="text-2xl font-bold text-primary mt-1">{medList.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={(alerts?.summary?.lowStockCount ?? 0) > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800">Low Stock Alert</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{alerts?.summary?.lowStockCount ?? 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={(alerts?.summary?.expiring30Count ?? 0) > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800">Expiring &lt;30 Days</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{alerts?.summary?.expiring30Count ?? 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={(alerts?.summary?.expiredCount ?? 0) > 0 ? 'border-red-300 bg-red-50/50' : ''}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-800">Expired Batches</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{alerts?.summary?.expiredCount ?? 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
            <Input
              type="text"
              placeholder="Search medicine by brand, generic name, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Medicines Roster Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={9} />
            </div>
          ) : medList.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary">
              No medicines found matching search criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-text-secondary font-semibold border-b border-surface-border">
                <tr>
                  <th className="p-3.5">Medicine Name</th>
                  <th className="p-3.5">Brand / Generic</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Unit</th>
                  <th className="p-3.5 text-right">Selling Price (₹)</th>
                  <th className="p-3.5 text-right">Purchase Price (₹)</th>
                  <th className="p-3.5 text-center">Current Stock</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {medList.map((med) => {
                  const isLow = med.isLowStock || med.computedStock <= med.minimumStock;
                  return (
                    <tr
                      key={med.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isLow ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 font-bold text-primary">{med.name}</td>
                      <td className="p-3.5">
                        <p className="font-semibold text-text-main">{med.brand || 'N/A'}</p>
                        <p className="text-[11px] text-text-secondary">{med.genericName}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-primary">
                          {med.category?.name || 'General'}
                        </span>
                      </td>
                      <td className="p-3.5 text-text-secondary">{med.unit}</td>
                      <td className="p-3.5 text-right font-bold text-text-main">
                        ₹{Number(med.unitPrice).toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right text-text-secondary">
                        ₹{Number(med.purchasePrice || 0).toFixed(2)}
                      </td>
                      <td className="p-3.5 text-center font-bold text-base">
                        <span className={isLow ? 'text-amber-700' : 'text-emerald-700'}>
                          {med.computedStock}
                        </span>
                        <span className="text-[10px] text-text-secondary block font-normal">
                          Min: {med.minimumStock}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isLow ? (
                          <Badge variant="accent" size="sm" dot>
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm" dot>
                            In Stock
                          </Badge>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(med)}
                            aria-label={`Edit ${med.name}`}
                            className="p-1.5 rounded-lg text-primary hover:bg-primary-50 transition-colors"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isManager && (
                            <button
                              type="button"
                              onClick={() => setDeleteMed(med)}
                              aria-label={`Deactivate ${med.name}`}
                              className="p-1.5 rounded-lg text-status-danger hover:bg-status-danger/10 transition-colors"
                              title="Deactivate Medicine"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Edit Medicine Modal */}
      {selectedMed && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Medicine Master — ${selectedMed.name}`}
          description="Update medicine formulation, classification, pricing, and stock alert levels."
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Medicine Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
              <Input
                label="Brand / Manufacturer"
                placeholder="e.g. Glenmark, Cipla"
                value={editForm.brand}
                onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Generic Composition / Salt"
                placeholder="e.g. Adapalene 0.1% + Benzoyl Peroxide 2.5%"
                value={editForm.genericName}
                onChange={(e) => setEditForm({ ...editForm, genericName: e.target.value })}
              />
              <div>
                <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                  Category
                </label>
                <select
                  className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                  Packaging / Unit
                </label>
                <select
                  className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Tube (Cream/Gel)">Tube (Cream/Gel)</option>
                  <option value="Bottle (Serum/Lotion)">Bottle (Serum/Lotion)</option>
                  <option value="Bottle (Shampoo/Wash)">Bottle (Shampoo/Wash)</option>
                  <option value="Syringe / Vial">Syringe / Vial</option>
                  <option value="Unit">Unit</option>
                </select>
              </div>

              <Input
                label="Selling Price (₹)"
                type="number"
                step="0.01"
                min="0"
                value={editForm.unitPrice}
                onChange={(e) => setEditForm({ ...editForm, unitPrice: parseFloat(e.target.value) || 0 })}
                required
              />

              <Input
                label="MRP (₹)"
                type="number"
                step="0.01"
                min="0"
                value={editForm.mrp}
                onChange={(e) => setEditForm({ ...editForm, mrp: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Purchase Cost (₹)"
                type="number"
                step="0.01"
                min="0"
                value={editForm.purchasePrice}
                onChange={(e) => setEditForm({ ...editForm, purchasePrice: parseFloat(e.target.value) || 0 })}
              />

              <Input
                label="GST Rate (%)"
                type="number"
                min="0"
                max="28"
                value={editForm.gstRate}
                onChange={(e) => setEditForm({ ...editForm, gstRate: parseFloat(e.target.value) || 0 })}
              />

              <Input
                label="Min Stock Alert (Units)"
                type="number"
                min="1"
                value={editForm.minimumStock}
                onChange={(e) => setEditForm({ ...editForm, minimumStock: parseInt(e.target.value) || 10 })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Formulary Status
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={editForm.isActive ? 'true' : 'false'}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
              >
                <option value="true">Active (Available for Prescribing & Dispensing)</option>
                <option value="false">Inactive / Discontinued</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Save Master Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deactivate Medicine Modal */}
      <Modal
        isOpen={!!deleteMed}
        onClose={() => setDeleteMed(null)}
        title="Confirm Medicine Deactivation"
        description="Are you sure you want to deactivate this medicine from the active catalog?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 space-y-1">
              <p className="font-semibold">
                Deactivating {deleteMed?.name}
              </p>
              <p>
                This item will no longer appear in the doctor prescription builder or inward purchase selection. Past batches and dispensed sales records will remain preserved.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setDeleteMed(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              isLoading={isDeleteSubmitting}
              onClick={handleDeleteMedicine}
            >
              Confirm Deactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

