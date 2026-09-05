import { ConfigService } from '@nestjs/config';

export const DEV_JWT_ACCESS_SECRET = 'ewa_derma_super_secret_access_jwt_key_2026_clinical';
export const DEV_JWT_REFRESH_SECRET = 'ewa_derma_super_secret_refresh_jwt_key_2026_clinical';

export function getJwtAccessSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_ACCESS_SECRET');
  if (!secret || secret === DEV_JWT_ACCESS_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '⚠️ WARNING: JWT_ACCESS_SECRET is not set in production. Using default fallback. Please set a secure random string in your Railway environment variables.',
      );
    }
  }
  return secret || DEV_JWT_ACCESS_SECRET;
}

export function getJwtRefreshSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_REFRESH_SECRET');
  if (!secret || secret === DEV_JWT_REFRESH_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '⚠️ WARNING: JWT_REFRESH_SECRET is not set in production. Using default fallback. Please set a secure random string in your Railway environment variables.',
      );
    }
  }
  return secret || DEV_JWT_REFRESH_SECRET;
}
