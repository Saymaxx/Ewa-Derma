import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

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
    const existing = await this.prisma.doctor.findUnique({
      where: { userId: createDoctorDto.userId },
    });

    if (existing) {
      throw new ConflictException('Doctor profile already exists for this user.');
    }

    return this.prisma.doctor.create({
      data: {
        userId: createDoctorDto.userId,
        specialization: createDoctorDto.specialization,
        qualification: createDoctorDto.qualification,
        regNumber: createDoctorDto.regNumber,
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
          },
        },
      },
    });
  }

  async update(id: string, updateDoctorDto: UpdateDoctorDto) {
    await this.findOne(id);

    return this.prisma.doctor.update({
      where: { id },
      data: {
        specialization: updateDoctorDto.specialization,
        qualification: updateDoctorDto.qualification,
        regNumber: updateDoctorDto.regNumber,
        consultationFee: updateDoctorDto.consultationFee,
        workingDays: updateDoctorDto.workingDays,
        workingHours: updateDoctorDto.workingHours,
        isActive: updateDoctorDto.isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });
  }
}
