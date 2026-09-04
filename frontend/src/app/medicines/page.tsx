'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Package,
  PackagePlus,
  Search,
  AlertTriangle,
  Clock,
  TrendingDown,
  Edit2,
  ShoppingCart,
  Sliders,
  Calendar,
} from 'lucide-react';

export default function MedicinesPage() {
  const { showToast } = useToast();

  const [medicines, setMedicines] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Edit Modal State
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
  const [editMrp, setEditMrp] = useState<number>(0);
  const [editMinStock, setEditMinStock] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMedicines = useCallback(async () => {
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
    setEditPrice(Number(med.unitPrice));
    setEditPurchasePrice(Number(med.purchasePrice || 0));
    setEditMrp(Number(med.mrp));
    setEditMinStock(med.minimumStock);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/medicines/${selectedMed.id}`, {
        unitPrice: editPrice,
        purchasePrice: editPurchasePrice,
        mrp: editMrp,
        minimumStock: editMinStock,
      });
      showToast('Medicine master details updated successfully', 'success');
      setIsEditOpen(false);
      fetchMedicines();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update medicine', 'error');
    } finally {
      setIsSubmitting(false);
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            <div className="p-8 text-center text-xs text-text-secondary animate-pulse">
              Loading medicine formulary catalog...
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
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(med)}
                          className="p-1.5 rounded-lg text-primary hover:bg-primary-50 font-semibold cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
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

      {/* Edit Medicine Modal */}
      {selectedMed && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Medicine Master — ${selectedMed.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs text-text-main">
            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Selling Price per Unit (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editPrice}
                onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Purchase Cost Price (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editPurchasePrice}
                onChange={(e) => setEditPurchasePrice(parseFloat(e.target.value) || 0)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Maximum Retail Price / MRP (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editMrp}
                onChange={(e) => setEditMrp(parseFloat(e.target.value) || 0)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Minimum Stock Alert Threshold (Units)
              </label>
              <Input
                type="number"
                min="1"
                value={editMinStock}
                onChange={(e) => setEditMinStock(parseInt(e.target.value) || 10)}
                className="text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                Save Master Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
