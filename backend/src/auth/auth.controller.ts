import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/username and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful, returns tokens and user info' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  @ApiResponse({ status: 429, description: 'Too many login attempts. Rate limit exceeded.' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return this.authService.login(loginDto, String(ip), String(userAgent));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a valid refresh token for a new access & refresh token pair' })
  @ApiResponse({ status: 200, description: 'Tokens rotated and refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return this.authService.refreshToken(refreshTokenDto, String(ip), String(userAgent));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke current refresh token session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return this.authService.logout(user.id, body.refreshToken, String(ip), String(userAgent));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile and roles' })
  @ApiResponse({ status: 200, description: 'Current user profile with role permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized / Token invalid' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }
}
