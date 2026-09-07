import 'reflect-metadata';
import { validateEnv, Environment } from './env.validation';
import { DEV_JWT_ACCESS_SECRET, DEV_JWT_REFRESH_SECRET } from '../../auth/jwt-secret.util';

describe('Environment Variable Validation (validateEnv)', () => {
  const baseValidConfig = {
    PORT: '4000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  };

  it('should accept default development configuration and allow default secrets', () => {
    const config = {
      ...baseValidConfig,
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: DEV_JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: DEV_JWT_REFRESH_SECRET,
    };

    const validated = validateEnv(config);
    expect(validated.PORT).toBe(4000);
    expect(validated.NODE_ENV).toBe(Environment.Development);
  });

  it('should allow production startup when secure non-default JWT secrets are provided', () => {
    const config = {
      ...baseValidConfig,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'secure_custom_production_jwt_access_secret_998877665544332211',
      JWT_REFRESH_SECRET: 'secure_custom_production_jwt_refresh_secret_998877665544332211',
    };

    const validated = validateEnv(config);
    expect(validated.NODE_ENV).toBe(Environment.Production);
  });

  it('should allow production startup when JWT_SECRET alias is provided instead of JWT_ACCESS_SECRET', () => {
    const config = {
      ...baseValidConfig,
      NODE_ENV: 'production',
      JWT_SECRET: 'secure_custom_production_jwt_access_secret_998877665544332211',
      JWT_REFRESH_SECRET: 'secure_custom_production_jwt_refresh_secret_998877665544332211',
    };

    const validated = validateEnv(config);
    expect(validated.NODE_ENV).toBe(Environment.Production);
  });

  it('should hard throw at startup in production if JWT_ACCESS_SECRET is missing or equals dev secret', () => {
    const config = {
      ...baseValidConfig,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: DEV_JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: 'secure_refresh_key_12345',
    };

    expect(() => validateEnv(config)).toThrow(
      /FATAL STARTUP SECURITY ERROR: INSECURE JWT SECRETS IN PRODUCTION/,
    );
  });

  it('should hard throw at startup in production if JWT_REFRESH_SECRET is missing or equals dev secret', () => {
    const config = {
      ...baseValidConfig,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'secure_access_key_12345',
      JWT_REFRESH_SECRET: DEV_JWT_REFRESH_SECRET,
    };

    expect(() => validateEnv(config)).toThrow(
      /FATAL STARTUP SECURITY ERROR: INSECURE JWT SECRETS IN PRODUCTION/,
    );
  });
});
