import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';

import { getJwtAccessSecret, getJwtRefreshSecret } from './jwt-secret.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { identifier, password } = loginDto;

    // Find user by email or username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { username: identifier.trim() },
        ],
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        doctor: true,
      },
    });

    if (!user) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILED',
        entityName: 'AUTH',
        details: { identifier, reason: 'User not found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials provided.');
    }

    if (!user.isActive) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityName: 'AUTH',
        details: { identifier, reason: 'Account is deactivated' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Your account has been deactivated. Please contact an Administrator.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityName: 'AUTH',
        details: { identifier, reason: 'Incorrect password' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials provided.');
    }

    // Extract roles
    const roles = user.userRoles.map((ur) => ur.role.name);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.username || undefined, roles);

    // Save refresh token hash in DB
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record login success in audit log
    await this.auditLogService.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityName: 'AUTH',
      entityId: user.id,
      details: { email: user.email, roles },
      ipAddress,
      userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        roles,
        doctorId: user.doctor?.id || null,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const { refreshToken } = refreshTokenDto;

    let payload: any;
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'ewa_derma_super_secret_refresh_jwt_key_2026_clinical';
      payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const userId = payload.sub;

    // Check refresh token in DB
    const tokensInDb = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    let matchedTokenRecord: any = null;
    for (const record of tokensInDb) {
      const isMatch = await argon2.verify(record.tokenHash, refreshToken);
      if (isMatch) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord) {
      // Possible token reuse attack - revoke all user tokens for security
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      await this.auditLogService.log({
        userId,
        action: 'REFRESH_TOKEN_REUSE_ATTEMPT',
        entityName: 'AUTH',
        details: { reason: 'Refresh token not found or already revoked' },
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException('Invalid refresh token.');
    }

    // Revoke used refresh token (Token Rotation)
    await this.prisma.refreshToken.update({
      where: { id: matchedTokenRecord.id },
      data: { isRevoked: true },
    });

    // Fetch fresh user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is invalid or deactivated.');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    // Generate new token pair
    const newTokens = await this.generateTokens(user.id, user.email, user.username || undefined, roles);
    await this.saveRefreshToken(user.id, newTokens.refreshToken);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken?: string, ipAddress?: string, userAgent?: string) {
    if (refreshToken) {
      const activeTokens = await this.prisma.refreshToken.findMany({
        where: { userId, isRevoked: false },
      });

      for (const tokenRecord of activeTokens) {
        try {
          const match = await argon2.verify(tokenRecord.tokenHash, refreshToken);
          if (match) {
            await this.prisma.refreshToken.update({
              where: { id: tokenRecord.id },
              data: { isRevoked: true },
            });
            break;
          }
        } catch {
          // Continue
        }
      }
    } else {
      // Revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

    await this.auditLogService.log({
      userId,
      action: 'LOGOUT',
      entityName: 'AUTH',
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Logged out successfully.' };
  }

  private cachedClinicSetting: any = null;
  private lastClinicFetchTime: number = 0;

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: { name: true },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            specialization: true,
            qualification: true,
            regNumber: true,
            consultationFee: true,
            workingDays: true,
            workingHours: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const now = Date.now();
    if (!this.cachedClinicSetting || now - this.lastClinicFetchTime > 300000) {
      this.cachedClinicSetting = await this.prisma.clinicSetting.findFirst();
      this.lastClinicFetchTime = now;
    }
    const clinic = this.cachedClinicSetting;

    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role.name),
      clinic: clinic
        ? {
            clinicName: clinic.clinicName,
            address: clinic.address,
            contactNumber: clinic.contactNumber,
            openingTime: clinic.openingTime,
            closingTime: clinic.closingTime,
            operatingDays: clinic.operatingDays,
            logoUrl: clinic.logoUrl,
          }
        : null,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    username: string | undefined,
    roles: string[],
  ) {
    const accessSecret = getJwtAccessSecret(this.configService);
    const accessExp = this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';

    const refreshSecret = getJwtRefreshSecret(this.configService);
    const refreshExp = this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    const payload = { sub: userId, email, username, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExp,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExp,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });
  }
}
