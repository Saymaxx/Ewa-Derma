import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryReportQueryDto } from './dto/inventory-report-query.dto';

export interface UserContext {
  userId: string;
  roles: string[];
  doctorId?: string;
}

@Injectable()
export class InventoryReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateInventoryReport(query: InventoryReportQueryDto, userContext: UserContext) {
    const isAdmin = userContext.roles.includes('ADMIN');
    const isInventoryManager = userContext.roles.includes('INVENTORY_MANAGER');

    // RBAC: Only ADMIN and INVENTORY_MANAGER allowed
    if (!isAdmin && !isInventoryManager) {
      throw new ForbiddenException(
        'Access denied: Inventory reports require ADMIN or INVENTORY_MANAGER role.',
      );
    }

    const startDateStr = query.startDate || '2026-01-01';
    const endDateStr = query.endDate || new Date().toISOString().split('T')[0];

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    // 1. Fetch Medicines Catalog & Computed Stock (Reused Phase 5 logic)
    const medicines = await this.prisma.medicine.findMany({
      where: {
        isActive: true,
        ...(query.medicineId ? { id: query.medicineId } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
      include: {
        category: { select: { name: true } },
        batches: true,
        transactions: true,
      },
      orderBy: { name: 'asc' },
    });

    let totalInventoryValue = 0;
    let lowStockCount = 0;

    const currentStockItems = medicines.map((med) => {
      // Reusing Phase 5 stock transaction ledger math
      const computedStock = med.transactions.reduce((sum, t) => sum + t.quantity, 0);
      const safeStock = Math.max(0, computedStock);

      const unitCost = Number((med as any).purchasePrice || med.unitPrice);
      const stockValuation = safeStock * unitCost;

      totalInventoryValue += stockValuation;
      const isLowStock = safeStock <= med.minimumStock;
      if (isLowStock) lowStockCount += 1;

      return {
        id: med.id,
        name: med.name,
        brandName: med.brand || 'N/A',
        category: med.category?.name || 'General Pharmacy',
        sku: `MED-${med.id.substring(0, 6).toUpperCase()}`,
        computedStock: safeStock,
        minimumStock: med.minimumStock,
        unitPrice: Number(med.unitPrice),
        purchasePrice: unitCost,
        stockValuation: Number(stockValuation.toFixed(2)),
        isLowStock,
      };
    });

    // 2. Expiring / Expired Batches (Reused Phase 5 alert logic)
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const allBatches = await this.prisma.medicineBatch.findMany({
      where: { isVoid: false },
      include: {
        medicine: { select: { name: true, category: { select: { name: true } } } },
        transactions: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    const expiringBatches = allBatches
      .map((b) => {
        const batchRemaining = (b.transactions && b.transactions.length > 0)
          ? b.transactions.reduce((sum, t) => sum + t.quantity, 0)
          : b.initialQuantity;

        if (batchRemaining <= 0) return null;

        let alertStatus: 'EXPIRED' | 'CRITICAL_30' | 'WARNING_60' | 'NORMAL' = 'NORMAL';
        if (b.expiryDate < now) {
          alertStatus = 'EXPIRED';
        } else if (b.expiryDate <= in30Days) {
          alertStatus = 'CRITICAL_30';
        } else if (b.expiryDate <= in60Days) {
          alertStatus = 'WARNING_60';
        }

        if (alertStatus === 'NORMAL') return null;

        const medId = b.medicineId || b.id || 'MED-101';
        return {
          id: b.id,
          batchNumber: b.batchNumber,
          medicineName: b.medicine.name,
          sku: `MED-${medId.substring(0, 6).toUpperCase()}`,
          quantity: batchRemaining,
          expiryDate: b.expiryDate.toISOString().split('T')[0],
          alertStatus,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    // 3. Stock Movement History Ledger in Date Range
    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...(query.medicineId ? { medicineId: query.medicineId } : {}),
      },
      include: {
        medicine: { select: { name: true, unitPrice: true } },
        batch: { select: { batchNumber: true } },
        dispensedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const movements = transactions.map((t) => ({
      id: t.id,
      date: t.createdAt.toISOString().split('T')[0],
      timestamp: t.createdAt.toISOString(),
      medicineName: t.medicine.name,
      sku: `MED-${t.medicineId.substring(0, 6).toUpperCase()}`,
      batchNumber: t.batch?.batchNumber || 'N/A',
      type: t.transactionType,
      quantity: Math.abs(t.quantity),
      direction: t.quantity > 0 ? 'IN' : 'OUT',
      reason: t.notes || t.referenceNumber || 'Stock movement',
      performedBy: t.dispensedBy ? `${t.dispensedBy.firstName} ${t.dispensedBy.lastName}` : 'System',
    }));

    // 4. Medicine Consumption Analytics (Dispensing volume in range)
    const consumptionMap: Record<string, { medicineName: string; sku: string; category: string; dispensedQty: number; totalValue: number }> = {};

    transactions
      .filter((t) => t.transactionType === 'DISPENSED_OUT')
      .forEach((t) => {
        const key = t.medicineId;
        const qty = Math.abs(t.quantity);
        if (!consumptionMap[key]) {
          consumptionMap[key] = {
            medicineName: t.medicine.name,
            sku: `MED-${t.medicineId.substring(0, 6).toUpperCase()}`,
            category: 'Pharmacy',
            dispensedQty: 0,
            totalValue: 0,
          };
        }
        consumptionMap[key].dispensedQty += qty;
        consumptionMap[key].totalValue += qty * Number(t.medicine.unitPrice);
      });

    const topConsumedMedicines = Object.values(consumptionMap).sort(
      (a, b) => b.dispensedQty - a.dispensedQty,
    );

    const totalItemsDispensed = transactions
      .filter((t) => t.transactionType === 'DISPENSED_OUT')
      .reduce((sum, t) => sum + Math.abs(t.quantity), 0);

    return {
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
      summary: {
        totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
        totalMedicinesCount: currentStockItems.length,
        lowStockCount,
        expiringBatchesCount: expiringBatches.length,
        totalItemsDispensed,
      },
      currentStockItems,
      expiringBatches,
      topConsumedMedicines,
      movements,
    };
  }
}
