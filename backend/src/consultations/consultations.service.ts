import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { RoleName, AppointmentStatus } from '@prisma/client';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateConsultationDto, user: { id: string; email: string; roles: RoleName[] }) {
    // 1. Verify Appointment exists
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { doctor: true, patient: true },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment not found with ID: ${dto.appointmentId}`);
    }

    // Check if consultation already exists for this appointment
    const existingConsultation = await this.prisma.consultation.findUnique({
      where: { appointmentId: dto.appointmentId },
    });

    if (existingConsultation) {
      throw new ConflictException('A consultation has already been recorded for this appointment.');
    }

    // Determine Doctor ID
    let doctorId = appointment.doctorId;
    if (user.roles.includes(RoleName.DOCTOR)) {
      const doctorProfile = await this.prisma.doctor.findUnique({
        where: { userId: user.id },
      });
      if (doctorProfile) {
        doctorId = doctorProfile.id;
      }
    }

    const followUpDateObj = dto.followUpDate ? new Date(dto.followUpDate) : null;
    const now = new Date();

    // 2. Atomic Transaction: Create Consultation, Diagnoses, and Complete Appointment
    const consultation = await this.prisma.$transaction(async (tx) => {
      const newConsultation = await tx.consultation.create({
        data: {
          appointmentId: dto.appointmentId,
          patientId: dto.patientId,
          doctorId,
          chiefComplaint: dto.chiefComplaint.trim(),
          symptoms: dto.symptoms?.trim() || null,
          clinicalFindings: dto.clinicalFindings?.trim() || null,
          treatmentPlan: dto.treatmentPlan?.trim() || null,
          doctorNotes: dto.doctorNotes?.trim() || null,
          followUpDate: followUpDateObj,
          diagnoses: dto.diagnoses && dto.diagnoses.length > 0
            ? {
                create: dto.diagnoses.map((d) => ({
                  conditionName: d.conditionName.trim(),
                  severity: d.severity?.trim() || null,
                  icdCode: d.icdCode?.trim() || null,
                  notes: d.notes?.trim() || null,
                })),
              }
            : undefined,
        },
        include: {
          diagnoses: true,
          patient: true,
          doctor: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      // Advance appointment to COMPLETED
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.COMPLETED,
          completedAt: now,
        },
      });

      // Add to status history
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: appointment.status,
          toStatus: AppointmentStatus.COMPLETED,
          changedBy: user.email,
          comment: 'Consultation completed and clinical records saved',
        },
      });

      return newConsultation;
    });

    this.logger.log(
      `Recorded Consultation ${consultation.id} for Patient ${appointment.patient.patientCode} with Dr. ${consultation.doctor.user.lastName}`,
    );

    return consultation;
  }

  async findByPatient(patientId: string, userRoles: RoleName[] = []) {
    const consultations = await this.prisma.consultation.findMany({
      where: {
        OR: [{ patientId }, { patient: { patientCode: patientId } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        diagnoses: true,
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        prescriptions: {
          where: { status: 'ACTIVE' },
          include: {
            items: true,
          },
        },
      },
    });

    // PRIVACY ENFORCEMENT: Strip doctorNotes if not DOCTOR or ADMIN
    const isPrivileged = userRoles.includes(RoleName.DOCTOR) || userRoles.includes(RoleName.ADMIN);
    if (!isPrivileged) {
      return consultations.map((c) => {
        const { doctorNotes, ...sanitized } = c;
        return { ...sanitized, doctorNotes: null };
      });
    }

    return consultations;
  }

  async findOne(id: string, userRoles: RoleName[] = []) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        diagnoses: true,
        patient: true,
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        prescriptions: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found with ID: ${id}`);
    }

    // PRIVACY ENFORCEMENT: Strip doctorNotes if not DOCTOR or ADMIN
    const isPrivileged = userRoles.includes(RoleName.DOCTOR) || userRoles.includes(RoleName.ADMIN);
    if (!isPrivileged) {
      const { doctorNotes, ...sanitized } = consultation;
      return { ...sanitized, doctorNotes: null };
    }

    return consultation;
  }
}
