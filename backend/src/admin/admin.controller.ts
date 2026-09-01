import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles(RoleName.ADMIN)
export class AdminController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health-check')
  @ApiOperation({ summary: 'Admin-only system status and health check (verifies RBAC)' })
  @ApiResponse({ status: 200, description: 'Admin verified and system operational' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not possess ADMIN role' })
  async healthCheck() {
    const userCount = await this.prisma.user.count();
    const roleCount = await this.prisma.role.count();
    const clinic = await this.prisma.clinicSetting.findFirst();

    return {
      status: 'healthy',
      system: 'Ewa Derma Clinic Management System',
      environment: process.env.NODE_ENV || 'development',
      stats: {
        totalUsers: userCount,
        totalRoles: roleCount,
        clinicName: clinic?.clinicName || 'Ewa Derma Clinic',
      },
    };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Admin audit logs retrieval' })
  @ApiResponse({ status: 200, description: 'List of recent system audit logs' })
  async getAuditLogs() {
    return this.auditLogService.getRecentLogs(50);
  }
}
