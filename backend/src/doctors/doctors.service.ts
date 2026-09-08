import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { RoleName } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(onlyActive: boolean = true) {
    return this.prisma.doctor.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            isActive: true,
          },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found.`);
    }

    return doctor;
  }

  async create(createDoctorDto: CreateDoctorDto) {
    let userId = createDoctorDto.userId;

    if (!userId) {
      if (!createDoctorDto.email || !createDoctorDto.firstName || !createDoctorDto.lastName) {
        throw new BadRequestException('First name, last name, and email are required to create a new doctor account.');
      }

      const emailNormalized = createDoctorDto.email.toLowerCase().trim();
      const existingUser = await this.prisma.user.findUnique({
        where: { email: emailNormalized },
      });

      if (existingUser) {
        throw new ConflictException(`User with email ${emailNormalized} already exists.`);
      }

      // Find or create DOCTOR role
      const doctorRole = await this.prisma.role.findUnique({
        where: { name: RoleName.DOCTOR },
      });

      const rawPassword = createDoctorDto.password || 'Doctor@123';
      const passwordHash = await argon2.hash(rawPassword);

      const newUser = await this.prisma.user.create({
        data: {
          email: emailNormalized,
          firstName: createDoctorDto.firstName.trim(),
          lastName: createDoctorDto.lastName.trim(),
          phoneNumber: createDoctorDto.phone?.trim() || null,
          passwordHash,
          isActive: true,
          ...(doctorRole && {
            userRoles: {
              create: {
                roleId: doctorRole.id,
              },
            },
          }),
        },
      });

      userId = newUser.id;
    } else {
      const existing = await this.prisma.doctor.findUnique({
        where: { userId },
      });

      if (existing) {
        throw new ConflictException('Doctor profile already exists for this user.');
      }
    }

    return this.prisma.doctor.create({
      data: {
        userId,
        specialization: createDoctorDto.specialization,
        qualification: createDoctorDto.qualification || null,
        regNumber: createDoctorDto.regNumber || null,
        consultationFee: createDoctorDto.consultationFee ?? 500,
        workingDays: createDoctorDto.workingDays ?? 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        workingHours: createDoctorDto.workingHours ?? '10:00-19:00',
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            isActive: true,
          },
        },
      },
    });
  }

  async update(id: string, updateDoctorDto: UpdateDoctorDto) {
    const doctor = await this.findOne(id);

    // Update user details if provided
    if (
      updateDoctorDto.firstName !== undefined ||
      updateDoctorDto.lastName !== undefined ||
      updateDoctorDto.email !== undefined ||
      updateDoctorDto.phone !== undefined ||
      updateDoctorDto.isActive !== undefined
    ) {
      await this.prisma.user.update({
        where: { id: doctor.userId },
        data: {
          ...(updateDoctorDto.firstName !== undefined && { firstName: updateDoctorDto.firstName.trim() }),
          ...(updateDoctorDto.lastName !== undefined && { lastName: updateDoctorDto.lastName.trim() }),
          ...(updateDoctorDto.email !== undefined && { email: updateDoctorDto.email.toLowerCase().trim() }),
          ...(updateDoctorDto.phone !== undefined && { phoneNumber: updateDoctorDto.phone.trim() }),
          ...(updateDoctorDto.isActive !== undefined && { isActive: updateDoctorDto.isActive }),
        },
      });
    }

    return this.prisma.doctor.update({
      where: { id },
      data: {
        ...(updateDoctorDto.specialization !== undefined && { specialization: updateDoctorDto.specialization }),
        ...(updateDoctorDto.qualification !== undefined && { qualification: updateDoctorDto.qualification }),
        ...(updateDoctorDto.regNumber !== undefined && { regNumber: updateDoctorDto.regNumber }),
        ...(updateDoctorDto.consultationFee !== undefined && { consultationFee: updateDoctorDto.consultationFee }),
        ...(updateDoctorDto.workingDays !== undefined && { workingDays: updateDoctorDto.workingDays }),
        ...(updateDoctorDto.workingHours !== undefined && { workingHours: updateDoctorDto.workingHours }),
        ...(updateDoctorDto.isActive !== undefined && { isActive: updateDoctorDto.isActive }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            isActive: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const doctor = await this.findOne(id);

    // Deactivate doctor and corresponding user
    await this.prisma.user.update({
      where: { id: doctor.userId },
      data: { isActive: false },
    });

    return this.prisma.doctor.update({
      where: { id },
      data: { isActive: false },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            isActive: true,
          },
        },
      },
    });
  }
}

