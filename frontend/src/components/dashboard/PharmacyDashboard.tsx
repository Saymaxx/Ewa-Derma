'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatGridSkeleton } from '@/components/ui/Skeleton';
import {
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  IndianRupee,
  Layers,
  Sparkles,
  Truck,
  ShieldAlert,
  BarChart3,
  PieChart,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface PharmacyDashboardProps {
  user: any;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [alertsData, setAlertsData] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [alertsRes, reportRes, purchasesRes, medsRes] = await Promise.all([
        api.get('/inventory/alerts').catch(() => ({ data: { data: null } })),
        api.get('/reports/inventory').catch(() => ({ data: { data: null } })),
        api.get('/inventory/purchases').catch(() => ({ data: { data: [] } })),
        api.get('/medicines', { params: { limit: 200 } }).catch(() => ({ data: { data: [] } })),
      ]);

      setAlertsData(alertsRes?.data?.data || null);
      setReportData(reportRes?.data?.data || null);

      const pData = purchasesRes?.data?.data ?? purchasesRes?.data;
      setPurchases(Array.isArray(pData) ? pData : (Array.isArray(pData?.items) ? pData.items : []));

      const mData = medsRes?.data?.data ?? medsRes?.data;
      setMedicines(Array.isArray(mData) ? mData : (Array.isArray(mData?.items) ? mData.items : []));
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived Metrics & Calculations
  const summary = alertsData?.summary || {
    lowStockCount: 0,
    expiredCount: 0,
    expiring30Count: 0,
    expiring60Count: 0,
    totalAlertsCount: 0,
  };

  const lowStockList = alertsData?.lowStockMedicines || [];
  const expiringList = alertsData?.expiringBatches || [];

  // Calculate Total Stock Valuation & Units
  const totalValuation = reportData?.summary?.totalInventoryValue ?? 
    medicines.reduce((acc, m) => acc + (Math.max(0, m.computedStock || 0) * Number(m.purchasePrice || m.unitPrice || 0)), 0);

  const totalInStockUnits = medicines.reduce((acc, m) => acc + Math.max(0, m.computedStock || 0), 0);
  const totalCatalogCount = medicines.length;

  // Category-wise Breakdown
  const categoryCounts: Record<string, { count: number; units: number }> = {};
  medicines.forEach((m) => {
    const cat = m.category?.name || 'General';
    if (!categoryCounts[cat]) {
      categoryCounts[cat] = { count: 0, units: 0 };
    }
    categoryCounts[cat].count += 1;
    categoryCounts[cat].units += Math.max(0, m.computedStock || 0);
  });

  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([name, data]) => ({
      name,
      count: data.count,
      units: data.units,
      percentage: totalInStockUnits > 0 ? Math.round((data.units / totalInStockUnits) * 100) : 0,
    }))
    .sort((a, b) => b.units - a.units);

  // High Velocity / Top Consumed
  const topConsumed = reportData?.analytics?.topConsumedMedicines?.slice(0, 5) || [];

  // Recent 5 Inward Purchases
  const recentPurchases = purchases.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif tracking-tight">
              Welcome, {user?.firstName} {user?.lastName}
            </h1>
            <span className="bg-amber-400/20 border border-amber-400 text-amber-300 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
              Pharmacy Manager
            </span>
          </div>
          <p className="text-purple-200 text-sm max-w-xl">
            Ewa Derma Clinic • Inventory Intelligence & Clinical FEFO Analytics
          </p>
        </div>
        <div className="z-10 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-xs text-purple-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Real-time Ledger Connected</span>
        </div>
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
      </div>

      {isLoading ? (
        <StatGridSkeleton />
      ) : (
        <>
          {/* Top 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Inventory Valuation */}
            <Card className="border-purple-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Total Stock Valuation
                  </span>
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-text-primary">
                    ₹{Number(totalValuation).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
                    <span>Valuation at purchase cost across active batches</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Active Formulary Medicines */}
            <Card className="border-blue-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Formulary Catalog
                  </span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-text-primary">
                    {totalCatalogCount} <span className="text-sm font-normal text-text-muted">Items</span>
                  </h3>
                  <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
                    <span className="font-semibold text-blue-600">{totalInStockUnits}</span> total units currently on clinic shelves
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 3. Low Stock Deficit */}
            <Card className={summary.lowStockCount > 0 ? 'border-amber-200 bg-amber-50/20 shadow-sm' : 'border-surface-border shadow-sm'}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Low Stock Deficits
                  </span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-text-primary">
                      {summary.lowStockCount}
                    </h3>
                    {summary.lowStockCount > 0 && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Action Required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">
                    Products falling below safe clinic threshold
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 4. Expiring FEFO Batches */}
            <Card className={summary.expiring30Count + summary.expiredCount > 0 ? 'border-rose-200 bg-rose-50/20 shadow-sm' : 'border-surface-border shadow-sm'}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Near-Expiry (FEFO)
                  </span>
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-text-primary">
                      {summary.expiring30Count + summary.expiring60Count + summary.expiredCount}
                    </h3>
                    {summary.expiredCount > 0 && (
                      <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        {summary.expiredCount} Expired
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">
                    Batches expiring within 60 days
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics & Insights 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category-wise Stock Volume Breakdown */}
            <Card>
              <CardHeader className="pb-3 border-b border-surface-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-text-primary">
                  <PieChart className="w-4 h-4 text-primary" />
                  Dermatology Stock Volume by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">No category data recorded yet.</p>
                ) : (
                  <div className="space-y-3.5">
                    {categoryBreakdown.slice(0, 6).map((cat) => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-text-primary flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {cat.name}
                          </span>
                          <span className="text-text-secondary font-medium">
                            {cat.units} units ({cat.count} items) • <strong className="text-text-primary">{cat.percentage}%</strong>
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* High-Velocity / Top Dispensed Medicines */}
            <Card>
              <CardHeader className="pb-3 border-b border-surface-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-text-primary">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Clinical Dispensing & Consumption Velocity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {topConsumed.length === 0 ? (
                  <div className="text-center py-6 space-y-1">
                    <p className="text-xs font-semibold text-text-primary">No recent prescription dispensing data</p>
                    <p className="text-[11px] text-text-muted">
                      As doctors prescribe and invoices are billed, top-moving items will rank here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {topConsumed.map((item: any, idx: number) => (
                      <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-text-primary">
                            {item.medicineName}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {item.dispensedQty} units dispensed
                          </span>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            ₹{Number(item.totalValue || 0).toLocaleString('en-IN')} billing value
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Critical Operational Watchlists (2-Column Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Low Stock Watchlist */}
            <Card>
              <CardHeader className="pb-3 border-b border-surface-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Low-Stock Reorder Watchlist ({lowStockList.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {lowStockList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-emerald-600 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    All formulary products are above safe stock thresholds!
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-surface-border text-text-muted uppercase text-[10px] font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Medicine</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3 text-center">In Stock</th>
                          <th className="py-2 px-3 text-center">Min Safe</th>
                          <th className="py-2 px-3 text-right">Shortage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {lowStockList.slice(0, 6).map((m: any) => (
                          <tr key={m.id} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3">
                              <span className="font-semibold text-text-primary block">{m.name}</span>
                              {m.brand && <span className="text-[10px] text-text-muted">{m.brand}</span>}
                            </td>
                            <td className="py-2 px-3 text-text-secondary">{m.category}</td>
                            <td className="py-2 px-3 text-center font-bold text-amber-700">{m.computedStock}</td>
                            <td className="py-2 px-3 text-center text-text-muted">{m.minimumStock}</td>
                            <td className="py-2 px-3 text-right font-bold text-rose-600">
                              -{m.shortage || Math.max(0, m.minimumStock - m.computedStock)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. FEFO Batch Expiry Tracker */}
            <Card>
              <CardHeader className="pb-3 border-b border-surface-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-900">
                  <Clock className="w-4 h-4 text-purple-700" />
                  FEFO Near-Expiry Watchlist ({expiringList.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {expiringList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-emerald-600 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    No batches expiring within the next 60 days.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-surface-border text-text-muted uppercase text-[10px] font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Batch & Medicine</th>
                          <th className="py-2 px-3">Supplier</th>
                          <th className="py-2 px-3 text-center">Remaining</th>
                          <th className="py-2 px-3 text-right">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {expiringList.slice(0, 6).map((b: any) => (
                          <tr key={b.batchId} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3">
                              <span className="font-semibold text-text-primary block">{b.medicineName}</span>
                              <span className="font-mono text-[10px] text-purple-700">{b.batchNumber}</span>
                            </td>
                            <td className="py-2 px-3 text-text-secondary">{b.supplierName || 'Clinic Stock'}</td>
                            <td className="py-2 px-3 text-center font-bold">{b.computedStock}</td>
                            <td className="py-2 px-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  b.status === 'EXPIRED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : b.status === 'EXPIRING_30'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {new Date(b.expiryDate).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Inward Stock Invoices / Purchases */}
          <Card>
            <CardHeader className="pb-3 border-b border-surface-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-text-primary">
                <Truck className="w-4 h-4 text-primary" />
                Recent Inward Stock Purchases & Supplier Shipments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentPurchases.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-muted">
                  No inward stock purchases logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-surface-border text-text-muted uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Medicine Master</th>
                        <th className="py-2.5 px-4">Batch Number</th>
                        <th className="py-2.5 px-4">Vendor / Supplier</th>
                        <th className="py-2.5 px-4 text-center">Inward Quantity</th>
                        <th className="py-2.5 px-4 text-right">Batch Expiry</th>
                        <th className="py-2.5 px-4 text-right">Inward Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {recentPurchases.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-4 font-semibold text-text-primary">
                            {p.medicine?.name || 'Medicine'}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-purple-700">
                            {p.batchNumber}
                          </td>
                          <td className="py-2.5 px-4 text-text-secondary">
                            {p.supplier?.name || 'General Supplier'}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-emerald-700">
                            +{p.quantity}
                          </td>
                          <td className="py-2.5 px-4 text-right text-text-muted">
                            {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="py-2.5 px-4 text-right text-text-muted">
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
