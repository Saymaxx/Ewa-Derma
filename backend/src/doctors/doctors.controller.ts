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
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Doctors')
@ApiBearerAuth()
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of doctors and availability' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of doctors retrieved successfully' })
  async findAll(@Query('onlyActive') onlyActive?: string) {
    const activeOnly = onlyActive !== 'false';
    return this.doctorsService.findAll(activeOnly);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single doctor profile' })
  @ApiResponse({ status: 200, description: 'Doctor profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  async findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Post()
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Create doctor profile (Admin only)' })
  @ApiResponse({ status: 201, description: 'Doctor profile created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(createDoctorDto);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Update doctor profile, fees, or working hours (Admin only)' })
  @ApiResponse({ status: 200, description: 'Doctor profile updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(id, updateDoctorDto);
  }
}
