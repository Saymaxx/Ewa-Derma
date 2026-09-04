import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventoryAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    const in60Days = new Date(today);
    in60Days.setDate(today.getDate() + 60);

    // 1. Fetch medicines and batches in parallel without child transactions
    const [medicines, batches, medStockAggs, batchStockAggs] = await Promise.all([
      this.prisma.medicine.findMany({
        where: { isActive: true },
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.medicineBatch.findMany({
        where: { isVoid: false },
        orderBy: { expiryDate: 'asc' },
        include: {
          medicine: { select: { id: true, name: true, brand: true, unit: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
      this.prisma.inventoryTransaction.groupBy({
        by: ['medicineId'],
        _sum: { quantity: true },
      }),
      this.prisma.inventoryTransaction.groupBy({
        by: ['batchId'],
        where: { batchId: { not: null } },
        _sum: { quantity: true },
      }),
    ]);

    const medStockMap = new Map<string, number>();
    medStockAggs.forEach((m) => medStockMap.set(m.medicineId, m._sum.quantity || 0));

    const batchStockMap = new Map<string, number>();
    batchStockAggs.forEach((b) => {
      if (b.batchId) batchStockMap.set(b.batchId, b._sum.quantity || 0);
    });

    const lowStockList = medicines
      .map((med) => {
        const computedStock = medStockMap.get(med.id) || 0;
        return {
          id: med.id,
          name: med.name,
          brand: med.brand,
          category: med.category?.name || 'General',
          unit: med.unit,
          minimumStock: med.minimumStock,
          computedStock,
          shortage: Math.max(0, med.minimumStock - computedStock),
        };
      })
      .filter((m) => m.computedStock <= m.minimumStock);

    const batchAlerts = batches
      .map((b) => {
        const computedStock = batchStockMap.get(b.id) || 0;
        let status: 'EXPIRED' | 'EXPIRING_30' | 'EXPIRING_60' | 'OK' = 'OK';

        if (b.expiryDate <= today) {
          status = 'EXPIRED';
        } else if (b.expiryDate <= in30Days) {
          status = 'EXPIRING_30';
        } else if (b.expiryDate <= in60Days) {
          status = 'EXPIRING_60';
        }

        return {
          batchId: b.id,
          batchNumber: b.batchNumber,
          medicineId: b.medicineId,
          medicineName: b.medicine.name,
          brand: b.medicine.brand,
          expiryDate: b.expiryDate,
          supplierName: b.supplier?.name || 'Unknown Vendor',
          computedStock,
          status,
        };
      })
      .filter((b) => b.computedStock > 0 && b.status !== 'OK');

    const expiredCount = batchAlerts.filter((b) => b.status === 'EXPIRED').length;
    const expiring30Count = batchAlerts.filter((b) => b.status === 'EXPIRING_30').length;
    const expiring60Count = batchAlerts.filter((b) => b.status === 'EXPIRING_60').length;

    return {
      summary: {
        lowStockCount: lowStockList.length,
        expiredCount,
        expiring30Count,
        expiring60Count,
        totalAlertsCount: lowStockList.length + batchAlerts.length,
      },
      lowStockMedicines: lowStockList,
      expiringBatches: batchAlerts,
    };
  }
}
