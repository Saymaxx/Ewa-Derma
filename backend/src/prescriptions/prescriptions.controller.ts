import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreatePrescriptionVersionDto } from './dto/create-prescription-version.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Roles(RoleName.ADMIN, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Create a medical prescription (v1) with multiple medicine items' })
  @ApiResponse({ status: 201, description: 'Prescription created with RX-3001 sequential code' })
  @ApiResponse({ status: 403, description: 'Forbidden for Receptionists' })
  async create(
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prescriptionsService.create(dto, {
      id: user.id,
      email: user.email,
      roles: user.roles as RoleName[],
    });
  }

  @Post(':id/version')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Revise/edit prescription (Mandatory immutable versioning v2, v3...)' })
  @ApiResponse({ status: 201, description: 'New version spawned and prior version marked SUPERSEDED' })
  async createVersion(
    @Param('id') id: string,
    @Body() dto: CreatePrescriptionVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prescriptionsService.createVersion(id, dto, {
      id: user.id,
      email: user.email,
      roles: user.roles as RoleName[],
    });
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Get prescription details and items' })
  @ApiResponse({ status: 200, description: 'Prescription retrieved' })
  async findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Get(':id/versions')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Get full immutable version history of a prescription' })
  @ApiResponse({ status: 200, description: 'List of all versions for this prescription tree' })
  async getVersions(@Param('id') id: string) {
    return this.prescriptionsService.getVersions(id);
  }

  @Get('patient/:patientId')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Get all prescriptions for a patient' })
  @ApiResponse({ status: 200, description: 'List of patient prescriptions' })
  async findByPatient(@Param('patientId') patientId: string) {
    return this.prescriptionsService.findByPatient(patientId);
  }

  @Get(':id/pdf')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Download or stream prescription PDF with Ewa Derma clinic letterhead' })
  @ApiResponse({ status: 200, description: 'Binary PDF document buffer' })
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.prescriptionsService.generatePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(Buffer.from(buffer));
  }
}
