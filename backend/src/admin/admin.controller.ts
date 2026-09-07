import {
  Controller,
  Get,
  Patch,
  Post,
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
}
