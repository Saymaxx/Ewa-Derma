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
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Register a new patient (Receptionist / Admin)' })
  @ApiResponse({ status: 201, description: 'Patient registered with sequential P-xxxx code' })
  @ApiResponse({ status: 400, description: 'Invalid input validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden for Doctors & Inventory Managers' })
  async create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
  }

  @Get()
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Search and list patients with debounced query' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Name, phone or P-xxxx code' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of patients' })
  async search(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.patientsService.search(search, parseInt(page || '1', 10), parseInt(limit || '20', 10));
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST, RoleName.DOCTOR)
  @ApiOperation({ summary: 'Get detailed patient profile and visit history' })
  @ApiResponse({ status: 200, description: 'Patient profile retrieved' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Update patient demographic data (Admin / Receptionist only)' })
  @ApiResponse({ status: 200, description: 'Patient updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden for Doctors (read-only) & Inventory Managers' })
  async update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientsService.update(id, updatePatientDto);
  }
}
