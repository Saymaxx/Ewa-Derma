import { ConfigService } from '@nestjs/config';

export const DEV_JWT_ACCESS_SECRET = 'ewa_derma_super_secret_access_jwt_key_2026_clinical';
export const DEV_JWT_REFRESH_SECRET = 'ewa_derma_super_secret_refresh_jwt_key_2026_clinical';

export function getJwtAccessSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_ACCESS_SECRET');
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && (!secret || secret === DEV_JWT_ACCESS_SECRET)) {
    throw new Error(
      'FATAL SECURITY ERROR: Environment variable JWT_ACCESS_SECRET must be explicitly set to a strong random secret in production.',
    );
  }
  return secret || DEV_JWT_ACCESS_SECRET;
}

export function getJwtRefreshSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_REFRESH_SECRET');
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && (!secret || secret === DEV_JWT_REFRESH_SECRET)) {
    throw new Error(
      'FATAL SECURITY ERROR: Environment variable JWT_REFRESH_SECRET must be explicitly set to a strong random secret in production.',
    );
  }
  return secret || DEV_JWT_REFRESH_SECRET;
}
