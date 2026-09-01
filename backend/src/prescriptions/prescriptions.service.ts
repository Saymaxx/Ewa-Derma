import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityIdService } from '../common/services/entity-id.service';
import { PdfService } from './pdf.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreatePrescriptionVersionDto } from './dto/create-prescription-version.dto';
import { PrescriptionStatus, RoleName } from '@prisma/client';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityIdService: EntityIdService,
    private readonly pdfService: PdfService,
  ) {}

  async create(dto: CreatePrescriptionDto, user: { id: string; email: string; roles: RoleName[] }) {
    // 1. Verify Consultation & Patient
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: dto.consultationId },
      include: {
        doctor: true,
        patient: true,
        diagnoses: true,
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found with ID: ${dto.consultationId}`);
    }

    // 2. Generate sequential Prescription Code: RX-3001
    const prescriptionCode = await this.entityIdService.generateNextId('RX');
    const followUpDateObj = dto.followUpDate ? new Date(dto.followUpDate) : consultation.followUpDate;

    // 3. Create Prescription & Line items (Decoupled from stock deduction)
    const prescription = await this.prisma.prescription.create({
      data: {
        prescriptionCode,
        consultationId: dto.consultationId,
        patientId: dto.patientId,
        doctorId: consultation.doctorId,
        version: 1,
        status: PrescriptionStatus.ACTIVE,
        generalAdvice: dto.generalAdvice?.trim() || null,
        followUpDate: followUpDateObj,
        items: {
          create: dto.items.map((item) => ({
            medicineId: item.medicineId || null,
            medicineName: item.medicineName.trim(),
            dosage: item.dosage.trim(),
            frequency: item.frequency.trim(),
            duration: item.duration.trim(),
            route: item.route || 'Oral',
            quantity: item.quantity || 1,
            instructions: item.instructions?.trim() || null,
            isDispensed: false, // Stock untouched in Phase 3
          })),
        },
      },
      include: {
        items: true,
        patient: true,
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    this.logger.log(`Created Prescription: ${prescription.prescriptionCode} (v1) for Patient ${consultation.patient.patientCode}`);
    return prescription;
  }

  async createVersion(
    id: string,
    dto: CreatePrescriptionVersionDto,
    user: { id: string; email: string; roles: RoleName[] },
  ) {
    const existing = await this.prisma.prescription.findUnique({
      where: { id },
      include: { consultation: true, patient: true, doctor: true },
    });

    if (!existing) {
      throw new NotFoundException(`Prescription not found with ID: ${id}`);
    }

    if (existing.status !== PrescriptionStatus.ACTIVE) {
      throw new BadRequestException(`Cannot revise a prescription that is not in ACTIVE status.`);
    }

    const nextVersion = existing.version + 1;
    const followUpDateObj = dto.followUpDate ? new Date(dto.followUpDate) : existing.followUpDate;

    // ATOMIC VERSIONING: Mark current as SUPERSEDED, create new version referencing parent
    const [superseded, newVersionPrescription] = await this.prisma.$transaction([
      this.prisma.prescription.update({
        where: { id: existing.id },
        data: { status: PrescriptionStatus.SUPERSEDED },
      }),
      this.prisma.prescription.create({
        data: {
          prescriptionCode: `${existing.prescriptionCode}`,
          consultationId: existing.consultationId,
          patientId: existing.patientId,
          doctorId: existing.doctorId,
          version: nextVersion,
          parentPrescriptionId: existing.id,
          status: PrescriptionStatus.ACTIVE,
          generalAdvice: dto.generalAdvice?.trim() || existing.generalAdvice,
          followUpDate: followUpDateObj,
          items: {
            create: dto.items.map((item) => ({
              medicineId: item.medicineId || null,
              medicineName: item.medicineName.trim(),
              dosage: item.dosage.trim(),
              frequency: item.frequency.trim(),
              duration: item.duration.trim(),
              route: item.route || 'Oral',
              quantity: item.quantity || 1,
              instructions: item.instructions?.trim() || null,
              isDispensed: false,
            })),
          },
        },
        include: {
          items: true,
          patient: true,
          doctor: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    this.logger.log(`Spawned Prescription Version: ${newVersionPrescription.prescriptionCode} (v${nextVersion}) from parent ${existing.id}`);
    return newVersionPrescription;
  }

  async findOne(id: string) {
    // First try by UUID id directly
    let prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
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
        consultation: {
          include: {
            diagnoses: true,
          },
        },
      },
    });

    // Fall back to finding latest version by prescriptionCode
    if (!prescription) {
      prescription = await this.prisma.prescription.findFirst({
        where: { prescriptionCode: id },
        orderBy: { version: 'desc' },
        include: {
          items: true,
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
          consultation: {
            include: {
              diagnoses: true,
            },
          },
        },
      });
    }

    if (!prescription) {
      throw new NotFoundException(`Prescription not found with identifier: ${id}`);
    }

    return prescription;
  }

  async findByPatient(patientId: string) {
    return this.prisma.prescription.findMany({
      where: {
        OR: [{ patientId }, { patient: { patientCode: patientId } }],
      },
      orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
      include: {
        items: true,
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        consultation: {
          include: {
            diagnoses: true,
          },
        },
      },
    });
  }

  async getVersions(id: string) {
    const target = await this.findOne(id);
    const code = target.prescriptionCode;

    return this.prisma.prescription.findMany({
      where: { prescriptionCode: code },
      orderBy: { version: 'desc' },
      include: {
        items: true,
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async generatePdf(id: string): Promise<{ buffer: Uint8Array; filename: string }> {
    const prescription = await this.findOne(id);
    const settings = await this.prisma.clinicSetting.findFirst();

    const clinicName = settings?.clinicName || 'Ewa Derma Clinic';
    const clinicAddress = settings?.address || 'The Millennium Place, Golf City, Sector B, Ansal API, Lucknow, UP 226030';
    const clinicPhone = settings?.contactNumber || '0120-5244840';

    const patient = prescription.patient;
    const doctor = prescription.doctor;

    const diagnosesList = prescription.consultation?.diagnoses?.map(
      (d) => `${d.conditionName}${d.severity ? ` (${d.severity})` : ''}`,
    ) || [];

    const ageGender = `${patient.gender ? patient.gender.replace('_', ' ') : 'N/A'}`;

    const pdfBuffer = await this.pdfService.generatePrescriptionPdf({
      clinicName,
      clinicAddress,
      clinicPhone,
      prescriptionCode: prescription.prescriptionCode,
      version: prescription.version,
      date: new Date(prescription.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      doctorName: `${doctor.user.firstName} ${doctor.user.lastName}`,
      doctorSpecialization: doctor.specialization,
      doctorRegNumber: doctor.regNumber || undefined,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientCode: patient.patientCode,
      patientAgeGender: ageGender,
      patientPhone: patient.phone,
      diagnoses: diagnosesList,
      items: prescription.items.map((it) => ({
        medicineName: it.medicineName,
        dosage: it.dosage,
        frequency: it.frequency,
        duration: it.duration,
        route: it.route,
        instructions: it.instructions || undefined,
      })),
      generalAdvice: prescription.generalAdvice || undefined,
      followUpDate: prescription.followUpDate
        ? new Date(prescription.followUpDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : undefined,
    });

    const filename = `Prescription_${prescription.prescriptionCode}_v${prescription.version}.pdf`;
    return { buffer: pdfBuffer, filename };
  }
}
