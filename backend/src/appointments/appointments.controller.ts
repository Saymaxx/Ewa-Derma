import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RoleName, AppointmentStatus } from '@prisma/client';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Create or book an appointment (Receptionist / Admin)' })
  @ApiResponse({ status: 201, description: 'Appointment booked with sequential A-xxxx code' })
  @ApiResponse({ status: 409, description: 'Conflict - Doctor already booked for an overlapping slot' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointmentsService.create(createAppointmentDto, user.email || user.id);
  }

  @Get()
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Get list of appointments with filters' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'doctorId', required: false, type: String })
  @ApiQuery({ name: 'patientId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  @ApiResponse({ status: 200, description: 'Appointments list retrieved' })
  async findAll(
    @Query('date') date?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.appointmentsService.findAll({ date, doctorId, patientId, status });
  }

  @Get('queue/today')
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Get live waiting queue for today' })
  @ApiQuery({ name: 'doctorId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Live queue of checked-in / waiting patients' })
  async getLiveWaitingQueue(@Query('doctorId') doctorId?: string) {
    return this.appointmentsService.getLiveWaitingQueue(doctorId);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Get appointment details and full status transition history' })
  @ApiResponse({ status: 200, description: 'Appointment details retrieved' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Advance or transition appointment status (Enforces State Machine)' })
  @ApiResponse({ status: 200, description: 'Status updated and recorded in status history' })
  @ApiResponse({ status: 400, description: 'Invalid state machine transition' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointmentsService.updateStatus(id, dto, user.email || user.id);
  }
}
