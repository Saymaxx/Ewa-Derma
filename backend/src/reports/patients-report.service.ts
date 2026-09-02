import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientReportQueryDto } from './dto/patient-report-query.dto';
import { UserContext } from './appointments-report.service';

@Injectable()
export class PatientsReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePatientReport(
    query: PatientReportQueryDto,
    userContext: UserContext,
  ) {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = query.startDate ? new Date(query.startDate) : defaultStart;
    const endDate = query.endDate ? new Date(query.endDate) : now;

    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    const doctorScopeId =
      userContext.roles.includes('DOCTOR') && !userContext.roles.includes('ADMIN')
        ? userContext.doctorId
        : query.doctorId;

    // 1. New Patients (created within date range)
    const newPatientsWhere: any = {
      createdAt: {
        gte: startDate,
        lte: adjustedEndDate,
      },
    };

    if (doctorScopeId) {
      newPatientsWhere.appointments = {
        some: { doctorId: doctorScopeId },
      };
    }

    const newPatients = await this.prisma.patient.findMany({
      where: newPatientsWhere,
      select: {
        id: true,
        patientCode: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Returning Patients (patients who have > 1 appointments and had an appointment in date range)
    const rangeAppointmentsWhere: any = {
      appointmentDate: {
        gte: startDate,
        lte: adjustedEndDate,
      },
    };

    if (doctorScopeId) {
      rangeAppointmentsWhere.doctorId = doctorScopeId;
    }

    const rangeAppointments = await this.prisma.appointment.findMany({
      where: rangeAppointmentsWhere,
      select: {
        patientId: true,
      },
    });

    const activePatientIds = Array.from(
      new Set(rangeAppointments.map((a) => a.patientId)),
    );

    const activePatientsWithCounts = await this.prisma.patient.findMany({
      where: {
        id: { in: activePatientIds },
      },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    const returningPatients = activePatientsWithCounts
      .filter((p) => p._count.appointments > 1)
      .map((p) => ({
        id: p.id,
        patientCode: p.patientCode,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        totalVisits: p._count.appointments,
        createdAt: p.createdAt,
      }));

    // 3. Follow-Up Tracking (consultations with followUpDate in range or overdue)
    const consultationWhere: any = {
      followUpDate: {
        lte: adjustedEndDate,
      },
    };

    if (doctorScopeId) {
      consultationWhere.appointment = {
        doctorId: doctorScopeId,
      };
    }

    const consultations = await this.prisma.consultation.findMany({
      where: consultationWhere,
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
        appointment: {
          include: {
            doctor: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { followUpDate: 'asc' },
    });

    const followUps = consultations.map((c) => {
      const followDateStr = c.followUpDate
        ? new Date(c.followUpDate).toISOString().split('T')[0]
        : null;
      const todayStr = now.toISOString().split('T')[0];
      const isOverdue = followDateStr ? followDateStr < todayStr : false;

      return {
        consultationId: c.id,
        patientId: c.patient.id,
        patientCode: c.patient.patientCode,
        patientName: `${c.patient.firstName} ${c.patient.lastName}`,
        patientPhone: c.patient.phone,
        doctorName: `Dr. ${c.appointment.doctor.user.firstName} ${c.appointment.doctor.user.lastName}`,
        diagnosis: c.chiefComplaint,
        followUpDate: followDateStr,
        isOverdue,
      };
    });

    return {
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalNewPatients: newPatients.length,
        totalReturningPatients: returningPatients.length,
        totalActivePatients: activePatientIds.length,
        pendingFollowUps: followUps.length,
        overdueFollowUps: followUps.filter((f) => f.isOverdue).length,
      },
      newPatients: newPatients.map((p) => {
        let age: number | null = null;
        if (p.dateOfBirth) {
          const dob = new Date(p.dateOfBirth);
          age = now.getFullYear() - dob.getFullYear();
        }
        return {
          id: p.id,
          patientCode: p.patientCode,
          name: `${p.firstName} ${p.lastName}`,
          phone: p.phone,
          gender: p.gender,
          age,
          registeredOn: new Date(p.createdAt).toISOString().split('T')[0],
        };
      }),
      returningPatients: returningPatients.map((p) => ({
        id: p.id,
        patientCode: p.patientCode,
        name: `${p.firstName} ${p.lastName}`,
        phone: p.phone,
        totalVisits: p.totalVisits,
      })),
      followUps,
    };
  }
}
