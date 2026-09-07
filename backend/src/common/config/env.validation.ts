import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';
import { DEV_JWT_ACCESS_SECRET, DEV_JWT_REFRESH_SECRET } from '../../auth/jwt-secret.util';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRATION?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsNumber()
  SMTP_PORT?: number;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsOptional()
  @IsString()
  SMTP_FROM?: string;

   @IsOptional()
  @IsString()
  WHATSAPP_API_URL?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_API_KEY?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_ACCESS_TOKEN?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_PHONE_NUMBER_ID?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_BUSINESS_ACCOUNT_ID?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_API_VERSION?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const errorDetails = errors
      .map((err) => `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`)
      .join('; ');
    throw new Error(`[Configuration Error] Invalid environment variables: ${errorDetails}`);
  }

  const isProd = validatedConfig.NODE_ENV === Environment.Production;

  // STRICT PRODUCTION SECURITY CHECK
  if (isProd) {
    const accessSecret = validatedConfig.JWT_ACCESS_SECRET || validatedConfig.JWT_SECRET;
    const refreshSecret = validatedConfig.JWT_REFRESH_SECRET;

    const accessIsInvalid = !accessSecret || accessSecret === DEV_JWT_ACCESS_SECRET;
    const refreshIsInvalid = !refreshSecret || refreshSecret === DEV_JWT_REFRESH_SECRET;

    if (accessIsInvalid || refreshIsInvalid) {
      const issues: string[] = [];
      if (accessIsInvalid) {
        issues.push('JWT_ACCESS_SECRET (or JWT_SECRET) is missing or set to the known default development secret');
      }
      if (refreshIsInvalid) {
        issues.push('JWT_REFRESH_SECRET is missing or set to the known default development secret');
      }

      const errorMessage = `
================================================================================
🚨 FATAL STARTUP SECURITY ERROR: INSECURE JWT SECRETS IN PRODUCTION 🚨
================================================================================
The application refused to start in production mode because the following critical
security requirements failed:
${issues.map((i) => ` - ❌ ${i}`).join('\n')}

Please set strong, random, secret environment variables in your deployment dashboard
(e.g., Railway / Render / AWS) before starting in production mode.
================================================================================
`;
      throw new Error(errorMessage.trim());
    }
  }

  return validatedConfig;
}
