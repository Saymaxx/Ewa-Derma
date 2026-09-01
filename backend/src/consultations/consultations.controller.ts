import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Consultations')
@ApiBearerAuth()
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @Roles(RoleName.ADMIN, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Record a clinical consultation and advance appointment to Completed' })
  @ApiResponse({ status: 201, description: 'Consultation created and appointment completed' })
  @ApiResponse({ status: 403, description: 'Forbidden for Receptionist and Inventory Manager' })
  async create(
    @Body() dto: CreateConsultationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultationsService.create(dto, {
      id: user.id,
      email: user.email,
      roles: user.roles as RoleName[],
    });
  }

  @Get('patient/:patientId')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Get all past consultations for a patient (Doctor notes sanitized for reception)' })
  @ApiResponse({ status: 200, description: 'List of consultations' })
  async findByPatient(
    @Param('patientId') patientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultationsService.findByPatient(patientId, user.roles as RoleName[]);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Get single consultation details (Doctor notes sanitized for reception)' })
  @ApiResponse({ status: 200, description: 'Consultation details retrieved' })
  @ApiResponse({ status: 404, description: 'Consultation not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultationsService.findOne(id, user.roles as RoleName[]);
  }
}
