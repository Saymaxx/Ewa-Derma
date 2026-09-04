import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.SCHEDULED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.CHECKED_IN]: [
    AppointmentStatus.WAITING,
    AppointmentStatus.IN_CONSULTATION,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.WAITING]: [
    AppointmentStatus.IN_CONSULTATION,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.IN_CONSULTATION]: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityIdService: EntityIdService,
  ) {}

  async create(dto: CreateAppointmentDto, createdByUserId?: string) {
    // 1. Verify Patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient || !patient.isActive) {
      throw new NotFoundException(`Patient not found or inactive with ID: ${dto.patientId}`);
    }

    // 2. Verify Doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (!doctor || !doctor.isActive) {
      throw new NotFoundException(`Doctor not found or inactive with ID: ${dto.doctorId}`);
    }

    // 3. Verify Doctor Availability on requested Day of Week
    if (doctor.workingDays) {
      const dateParts = dto.appointmentDate.split('-');
      const dateObj = new Date(
        Date.UTC(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])),
      );
      const dayShortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayFullNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];

      const dayOfWeekShort = dayShortNames[dateObj.getUTCDay()];
      const dayOfWeekFull = dayFullNames[dateObj.getUTCDay()];

      const allowedDays = doctor.workingDays.split(',').map((d) => d.trim().slice(0, 3));

      if (!allowedDays.includes(dayOfWeekShort)) {
        throw new BadRequestException(
          `Dr. ${doctor.user.firstName} ${doctor.user.lastName} is not available on ${dayOfWeekFull}s (${dto.appointmentDate}). Scheduled working days: ${doctor.workingDays}.`,
        );
      }
    }

    const appointmentDateObj = new Date(dto.appointmentDate);

    // 4. Double-booking slot conflict protection for doctor
    const existingConflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        appointmentDate: appointmentDateObj,
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
        OR: [
          {
            startTime: { lt: dto.endTime },
            endTime: { gt: dto.startTime },
          },
          {
            startTime: dto.startTime,
          },
        ],
      },
    });

    if (existingConflict) {
      throw new ConflictException('This time slot is already booked. Please select another time.');
    }

    // Generate sequential Appointment Code: A-2001
    const appointmentCode = await this.entityIdService.generateNextId('A');

    // Default status: If walk-in, immediately mark as CHECKED_IN
    const initialStatus = dto.isWalkIn ? AppointmentStatus.CHECKED_IN : AppointmentStatus.SCHEDULED;
    const now = new Date();

    const appointment = await this.prisma.appointment.create({
      data: {
        appointmentCode,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        appointmentDate: appointmentDateObj,
        startTime: dto.startTime,
        endTime: dto.endTime,
        type: dto.type || AppointmentType.CONSULTATION,
        status: initialStatus,
        reason: dto.reason?.trim() || null,
        notes: dto.notes?.trim() || null,
        isWalkIn: !!dto.isWalkIn,
        checkedInAt: dto.isWalkIn ? now : null,
      },
      include: {
        patient: true,
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    // Record initial status in history
    await this.prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        fromStatus: null,
        toStatus: initialStatus,
        changedBy: createdByUserId || 'SYSTEM',
        comment: dto.isWalkIn ? 'Direct Walk-In Check-In' : 'Initial booking created',
      },
    });

    this.logger.log(`Created Appointment: ${appointment.appointmentCode} for Patient ${patient.patientCode} with Dr. ${doctor.user.lastName}`);
    return appointment;
  }

  async findAll(filters: {
    date?: string;
    doctorId?: string;
    patientId?: string;
    status?: AppointmentStatus;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};

    if (filters.date) {
      where.appointmentDate = new Date(filters.date);
    }
    if (filters.doctorId) {
      where.doctorId = filters.doctorId;
    }
    if (filters.patientId) {
      where.patientId = filters.patientId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const safeLimit = filters.limit ? Math.min(Math.max(1, Number(filters.limit)), 100) : (filters.date || filters.patientId ? undefined : 100);
    const safeSkip = filters.page && safeLimit ? (Math.max(1, Number(filters.page)) - 1) * safeLimit : undefined;

    return this.prisma.appointment.findMany({
      where,
      orderBy: [{ appointmentDate: 'desc' }, { startTime: 'asc' }],
      take: safeLimit,
      skip: safeSkip,
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            phone: true,
            gender: true,
            bloodGroup: true,
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
    });
  }

  async getDashboardStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalPatients,
      activeDoctors,
      todayAppointments,
      checkedInCount,
      allAppointmentsSummary,
      recent7DaysAppointments,
    ] = await Promise.all([
      this.prisma.patient.count({ where: { isActive: true } }),
      this.prisma.doctor.count({ where: { isActive: true } }),
      this.prisma.appointment.count({ where: { appointmentDate: todayDate } }),
      this.prisma.appointment.count({
        where: {
          appointmentDate: todayDate,
          status: { in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.WAITING, AppointmentStatus.IN_CONSULTATION] },
        },
      }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.appointment.findMany({
        where: { appointmentDate: { gte: sevenDaysAgo } },
        select: { appointmentDate: true, status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      SCHEDULED: 0,
      CONFIRMED: 0,
      CHECKED_IN: 0,
      WAITING: 0,
      IN_CONSULTATION: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    };

    let totalAppointments = 0;
    allAppointmentsSummary.forEach((group) => {
      statusCounts[group.status] = group._count._all;
      totalAppointments += group._count._all;
    });

    return {
      totalPatients,
      activeDoctors,
      todayAppointments,
      checkedInCount,
      totalAppointments,
      statusCounts,
      recent7DaysAppointments: recent7DaysAppointments.map((a) => ({
        appointmentDate: a.appointmentDate,
        status: a.status,
      })),
    };
  }

  async getLiveWaitingQueue(doctorId?: string) {
    return this.prisma.appointment.findMany({
      where: {
        doctorId: doctorId || undefined,
        status: {
          in: [
            AppointmentStatus.CHECKED_IN,
            AppointmentStatus.WAITING,
            AppointmentStatus.IN_CONSULTATION,
          ],
        },
      },
      orderBy: [
        // Active consultation first, then by check-in timestamp
        { status: 'desc' },
        { checkedInAt: 'asc' },
      ],
      include: {
        patient: true,
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        OR: [{ id }, { appointmentCode: id }],
      },
      include: {
        patient: true,
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment not found with identifier: ${id}`);
    }

    return appointment;
  }

  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    changedByUserId?: string,
  ) {
    const appointment = await this.findOne(id);
    const currentStatus = appointment.status;
    const targetStatus = dto.status;

    // Check if transition is valid
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition from "${currentStatus}" to "${targetStatus}". Allowed next states: [${allowedNextStatuses.join(', ') || 'None (Terminal state)'}]`,
      );
    }

    const now = new Date();
    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === AppointmentStatus.CHECKED_IN && !appointment.checkedInAt) {
      updateData.checkedInAt = now;
    } else if (targetStatus === AppointmentStatus.COMPLETED) {
      updateData.completedAt = now;
    } else if (targetStatus === AppointmentStatus.CANCELLED) {
      updateData.cancelledAt = now;
      updateData.cancellationReason = dto.cancellationReason?.trim() || null;
    }

    // Atomic update + history log
    const [updatedAppointment] = await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: updateData,
        include: {
          patient: true,
          doctor: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          changedBy: changedByUserId || 'SYSTEM',
          comment: dto.comment?.trim() || (dto.cancellationReason ? `Cancelled: ${dto.cancellationReason}` : null),
        },
      }),
    ]);

    this.logger.log(`Status changed for Appointment ${appointment.appointmentCode}: ${currentStatus} -> ${targetStatus}`);
    return updatedAppointment;
  }
}
