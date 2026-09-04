import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  async findAll() {
    return this.servicesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateServiceDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.servicesService.create(dto, userId);
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.servicesService.update(id, dto, userId);
  }
}
