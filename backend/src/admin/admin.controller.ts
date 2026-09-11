import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'logos');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health-check')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin-only system status and health check (verifies RBAC)' })
  @ApiResponse({ status: 200, description: 'Admin verified and system operational' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not possess ADMIN role' })
  async healthCheck() {
    const userCount = await this.prisma.user.count();
    const roleCount = await this.prisma.role.count();
    const clinic = await this.adminService.getClinicSettings();

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

  @Get('settings')
  @ApiOperation({ summary: 'Get clinic settings (accessible to all authenticated users)' })
  @ApiResponse({ status: 200, description: 'Current clinic profile and operational settings' })
  async getSettings() {
    return this.adminService.getClinicSettings();
  }

  @Patch('settings')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Update clinic settings (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Clinic settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  async updateSettings(@Body() dto: UpdateClinicSettingsDto) {
    return this.adminService.updateClinicSettings(dto);
  }

  @Post('settings/logo')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Upload clinic brand logo image (ADMIN only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) {
            mkdirSync(UPLOAD_DIR, { recursive: true });
          }
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `clinic-logo-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|svg\+xml)$/)) {
          return cb(new BadRequestException('Only image files (JPG, PNG, WebP, SVG) are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No image file provided for upload');
    }
    const relativeUrl = `/uploads/logos/${file.filename}`;
    // Auto-update the clinic setting logoUrl
    await this.adminService.updateClinicSettings({ logoUrl: relativeUrl });

    return {
      url: relativeUrl,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Get('audit-logs')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin audit logs retrieval with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of system audit logs' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  async getAuditLogs(@Query() query: GetAuditLogsDto) {
    return this.auditLogService.findAll(query);
  }

  // ==========================================
  // STAFF & ROLE ACCESS MANAGEMENT
  // ==========================================

  @Get('users')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'List all staff users with roles (Admin only)' })
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Create new staff user (Admin only)' })
  async createUser(
    @Body()
    dto: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      role: RoleName;
      password?: string;
    },
  ) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Update staff user details / role (Admin only)' })
  async updateUser(
    @Param('id') id: string,
    @Body()
    dto: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      role?: RoleName;
      isActive?: boolean;
    },
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Deactivate or permanently delete staff user account (Admin only)' })
  async deleteUser(
    @Param('id') id: string,
    @Query('permanent') permanent?: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ) {
    const isPermanent = permanent === 'true';
    return this.adminService.deleteUser(id, isPermanent, currentUser?.id);
  }

  @Post('users/:id/reset-password')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Reset staff user password (Admin only)' })
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { password?: string },
  ) {
    return this.adminService.resetUserPassword(id, body?.password);
  }

  // ==========================================
  // MEDIA STORAGE & RETENTION CLEANUP
  // ==========================================

  @Get('storage-stats')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Get total image storage statistics and disk usage' })
  @ApiResponse({ status: 200, description: 'Storage metrics retrieved successfully' })
  async getStorageStats() {
    return this.adminService.getStorageStats();
  }

  @Post('storage-cleanup')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Bulk cleanup old photos past retention window (e.g. older than 12, 24, 36 months)' })
  @ApiResponse({ status: 200, description: 'Bulk photo cleanup completed' })
  async cleanupOldPhotos(
    @Body() dto: { olderThanMonths: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.adminService.cleanupOldPhotos(dto, {
      id: user.id,
      email: user.email,
    });

    await this.auditLogService.log({
      userId: user.id,
      action: 'STORAGE_CLEANUP_EXECUTED',
      entityName: 'Storage',
      entityId: 'media-retention',
      details: {
        olderThanMonths: dto.olderThanMonths,
        clearedTotal: result.totalCleared,
        clearedConsultations: result.clearedConsultations,
        clearedPrescriptions: result.clearedPrescriptions,
      },
    });

    return result;
  }
}

