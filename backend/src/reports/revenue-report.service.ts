import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RevenueReportQueryDto } from './dto/revenue-report-query.dto';

export interface UserContext {
  userId: string;
  roles: string[];
  doctorId?: string;
}

@Injectable()
export class RevenueReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateRevenueReport(query: RevenueReportQueryDto, userContext: UserContext) {
    const isAdmin = userContext.roles.includes('ADMIN');
    const isDoctor = userContext.roles.includes('DOCTOR');

    // RBAC: Only ADMIN and DOCTOR (scoped) allowed
    if (!isAdmin && !isDoctor) {
      throw new ForbiddenException('Access denied: Revenue reports require ADMIN or DOCTOR role.');
    }

    const start = new Date(query.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);

    let scopedDoctorId = query.doctorId;
    if (isDoctor && !isAdmin) {
      scopedDoctorId = userContext.doctorId;
    }

    // Fetch Invoices, Payments, and Refunds in parallel
    const [invoices, payments, refunds] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...(scopedDoctorId
            ? {
                OR: [
                  { appointment: { doctorId: scopedDoctorId } },
                  { consultation: { doctorId: scopedDoctorId } },
                ],
              }
            : {}),
        },
        include: {
          patient: { select: { id: true, patientCode: true, firstName: true, lastName: true, phone: true } },
          items: true,
          payments: true,
          appointment: { select: { id: true, doctorId: true, doctor: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } } },
          consultation: { select: { id: true, doctorId: true, doctor: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...(scopedDoctorId
            ? {
                invoice: {
                  OR: [
                    { appointment: { doctorId: scopedDoctorId } },
                    { consultation: { doctorId: scopedDoctorId } },
                  ],
                },
              }
            : {}),
          ...(query.paymentMethod
            ? { paymentMethod: query.paymentMethod as any }
            : {}),
        },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceCode: true,
              patient: { select: { firstName: true, lastName: true, patientCode: true } },
              appointment: { select: { doctor: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } } },
              consultation: { select: { doctor: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } } },
            },
          },
        },
      }),
      this.prisma.refund.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...(scopedDoctorId
            ? {
                payment: {
                  invoice: {
                    OR: [
                      { appointment: { doctorId: scopedDoctorId } },
                      { consultation: { doctorId: scopedDoctorId } },
                    ],
                  },
                },
              }
            : {}),
        },
      }),
    ]);

    // Calculate Core Metrics
    const grossPaymentsReceived = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalRefundsIssued = refunds.reduce((acc, r) => acc + Number(r.amount), 0);
    const collectedRevenue = Math.max(0, grossPaymentsReceived - totalRefundsIssued);

    const billedRevenue = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);
    const totalOutstandingDue = invoices.reduce((acc, inv) => acc + Number(inv.dueAmount), 0);

    // 4. Payment Method Breakdown
    const paymentMethodMap: Record<string, { method: string; count: number; amount: number; percentage: number }> = {
      CASH: { method: 'Cash', count: 0, amount: 0, percentage: 0 },
      UPI: { method: 'UPI / QR', count: 0, amount: 0, percentage: 0 },
      CARD: { method: 'Credit/Debit Card', count: 0, amount: 0, percentage: 0 },
      BANK_TRANSFER: { method: 'Bank Transfer', count: 0, amount: 0, percentage: 0 },
    };

    payments.forEach((p) => {
      const pm = p.paymentMethod;
      if (paymentMethodMap[pm]) {
        paymentMethodMap[pm].count += 1;
        paymentMethodMap[pm].amount += Number(p.amount);
      }
    });

    const paymentMethodBreakdown = Object.values(paymentMethodMap).map((pm) => ({
      ...pm,
      percentage: grossPaymentsReceived > 0 ? Number(((pm.amount / grossPaymentsReceived) * 100).toFixed(1)) : 0,
    }));

    // 5. Doctor-wise Revenue Attribution
    const doctorRevenueMap: Record<string, { doctorId: string; doctorName: string; billed: number; collected: number; invoiceCount: number }> = {};

    invoices.forEach((inv) => {
      const doc = inv.appointment?.doctor || inv.consultation?.doctor;
      const docId = doc?.id || (inv.appointment?.doctorId) || 'unassigned';
      const docName = doc?.user ? `Dr. ${doc.user.firstName} ${doc.user.lastName}` : 'Unassigned / Direct Clinic';

      if (!doctorRevenueMap[docId]) {
        doctorRevenueMap[docId] = {
          doctorId: docId,
          doctorName: docName,
          billed: 0,
          collected: 0,
          invoiceCount: 0,
        };
      }

      doctorRevenueMap[docId].billed += Number(inv.totalAmount);
      doctorRevenueMap[docId].collected += Number(inv.paidAmount);
      doctorRevenueMap[docId].invoiceCount += 1;
    });

    const doctorBreakdown = Object.values(doctorRevenueMap);

    // 6. Service-wise Revenue Attribution from Invoice items
    const serviceRevenueMap: Record<string, { description: string; itemType: string; totalQty: number; totalRevenue: number }> = {};

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = `${item.itemType}:${item.description}`;
        if (!serviceRevenueMap[key]) {
          serviceRevenueMap[key] = {
            description: item.description,
            itemType: item.itemType,
            totalQty: 0,
            totalRevenue: 0,
          };
        }
        serviceRevenueMap[key].totalQty += item.quantity;
        serviceRevenueMap[key].totalRevenue += Number(item.totalPrice);
      });
    });

    const serviceBreakdown = Object.values(serviceRevenueMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 7. Itemized Invoices List
    const items = invoices.map((inv) => {
      const doc = inv.appointment?.doctor || inv.consultation?.doctor;
      return {
        id: inv.id,
        invoiceCode: inv.invoiceCode,
        createdAt: inv.createdAt.toISOString().split('T')[0],
        patientCode: inv.patient.patientCode,
        patientName: `${inv.patient.firstName} ${inv.patient.lastName}`,
        patientPhone: inv.patient.phone,
        doctorName: doc?.user ? `Dr. ${doc.user.firstName} ${doc.user.lastName}` : 'Direct Clinic',
        status: inv.status,
        subTotal: Number(inv.subTotal),
        discountAmount: Number(inv.discountAmount),
        taxAmount: Number(inv.taxAmount),
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        dueAmount: Number(inv.dueAmount),
      };
    });

    return {
      dateRange: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
      summary: {
        collectedRevenue: Number(collectedRevenue.toFixed(2)),
        billedRevenue: Number(billedRevenue.toFixed(2)),
        totalOutstandingDue: Number(totalOutstandingDue.toFixed(2)),
        totalRefundsIssued: Number(totalRefundsIssued.toFixed(2)),
        invoiceCount: invoices.length,
        paymentCount: payments.length,
      },
      paymentMethodBreakdown,
      doctorBreakdown,
      serviceBreakdown,
      items,
    };
  }
}
