import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentReportQueryDto } from './dto/appointment-report-query.dto';

export interface UserContext {
  userId: string;
  roles: string[];
  doctorId?: string;
}

@Injectable()
export class AppointmentsReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAppointmentReport(
    query: AppointmentReportQueryDto,
    userContext: UserContext,
  ) {
    const now = new Date();
    // Default to last 30 days if start date not specified
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = query.startDate ? new Date(query.startDate) : defaultStart;
    const endDate = query.endDate ? new Date(query.endDate) : now;

    // Adjust end date to cover end of day
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    // Build Prisma query filter
    const where: any = {
      appointmentDate: {
        gte: startDate,
        lte: adjustedEndDate,
      },
    };

    // Scoped doctor access: If user is DOCTOR role, force doctorId filter
    if (userContext.roles.includes('DOCTOR') && !userContext.roles.includes('ADMIN')) {
      if (userContext.doctorId) {
        where.doctorId = userContext.doctorId;
      }
    } else if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    // Fetch appointments & doctor details
    const [appointments, doctors] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          appointmentDate: 'desc',
        },
      }),
      this.prisma.doctor.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
    const noShow = appointments.filter((a) => a.status === 'NO_SHOW').length;
    const inConsultation = appointments.filter((a) => a.status === 'IN_CONSULTATION').length;
    const checkedIn = appointments.filter((a) => a.status === 'CHECKED_IN' || a.status === 'WAITING').length;
    const scheduled = appointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 1. Status Breakdown
    const statusCounts: Record<string, number> = {
      COMPLETED: completed,
      SCHEDULED: scheduled,
      CHECKED_IN: checkedIn,
      IN_CONSULTATION: inConsultation,
      CANCELLED: cancelled,
      NO_SHOW: noShow,
    };

    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

    // 2. Doctor-wise Breakdown
    const doctorMap: Record<string, { total: number; completed: number; cancelled: number }> = {};
    for (const apt of appointments) {
      const docId = apt.doctorId;
      if (!doctorMap[docId]) {
        doctorMap[docId] = { total: 0, completed: 0, cancelled: 0 };
      }
      doctorMap[docId].total += 1;
      if (apt.status === 'COMPLETED') doctorMap[docId].completed += 1;
      if (apt.status === 'CANCELLED') doctorMap[docId].cancelled += 1;
    }

    const doctorBreakdown = doctors
      .filter((d) => {
        // If doctor role, only include self
        if (userContext.roles.includes('DOCTOR') && !userContext.roles.includes('ADMIN')) {
          return d.id === userContext.doctorId;
        }
        return true;
      })
      .map((doc) => {
        const stats = doctorMap[doc.id] || { total: 0, completed: 0, cancelled: 0 };
        const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        return {
          doctorId: doc.id,
          doctorName: `Dr. ${doc.user.firstName} ${doc.user.lastName}`,
          specialization: doc.specialization,
          total: stats.total,
          completed: stats.completed,
          cancelled: stats.cancelled,
          completionRate: rate,
        };
      });

    // 3. Daily Trend Grouping
    const dailyMap: Record<string, { total: number; completed: number; cancelled: number }> = {};
    for (const apt of appointments) {
      const dateStr = new Date(apt.appointmentDate).toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { total: 0, completed: 0, cancelled: 0 };
      }
      dailyMap[dateStr].total += 1;
      if (apt.status === 'COMPLETED') dailyMap[dateStr].completed += 1;
      if (apt.status === 'CANCELLED') dailyMap[dateStr].cancelled += 1;
    }

    const dailyTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        total: stats.total,
        completed: stats.completed,
        cancelled: stats.cancelled,
      }));

    return {
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      summary: {
        total,
        completed,
        scheduled,
        checkedIn,
        inConsultation,
        cancelled,
        noShow,
        completionRate,
      },
      statusBreakdown,
      doctorBreakdown,
      dailyTrend,
      items: appointments.map((a) => ({
        id: a.id,
        appointmentCode: a.appointmentCode,
        appointmentDate: new Date(a.appointmentDate).toISOString().split('T')[0],
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        type: a.type,
        patientCode: a.patient.patientCode,
        patientName: `${a.patient.firstName} ${a.patient.lastName}`,
        patientPhone: a.patient.phone,
        doctorName: `Dr. ${a.doctor.user.firstName} ${a.doctor.user.lastName}`,
        specialization: a.doctor.specialization,
      })),
    };
  }
}
