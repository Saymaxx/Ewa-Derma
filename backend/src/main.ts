import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const corsOrigin = configService.get<string>('CORS_ORIGIN');

  // Register HTTP response compression
  app.use(compression());

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Configure CORS allowed origins
  const allowedOrigins: string[] = nodeEnv === 'production'
    ? [frontendUrl, corsOrigin].filter((url): url is string => Boolean(url))
    : [
        frontendUrl,
        corsOrigin,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ].filter((url, idx, self): url is string => Boolean(url) && self.indexOf(url) === idx);

  logger.log(`CORS allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'universal (development fallback)'}`);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    optionsSuccessStatus: 204,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger / OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Ewa Derma Clinic Management System API')
    .setDescription(
      'API specification for Ewa Derma Clinic. Handles Authentication, RBAC, Patient Records, Appointments, Prescriptions, Billing, and Inventory.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Login, token refresh, profile, and logout operations')
    .addTag('Admin', 'Administrative oversight and system health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Ewa Derma Clinic — API Documentation',
    customCss: `
      .swagger-ui .topbar { background-color: #1E4E8C; border-bottom: 3px solid #C9A24B; }
      .swagger-ui .topbar-wrapper img { content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="30" viewBox="0 0 120 30"><text x="0" y="22" fill="%23FFFFFF" font-family="sans-serif" font-weight="bold" font-size="18">EWA DERMA</text></svg>'); }
    `,
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Ewa Derma Clinic Backend running on port ${port} (0.0.0.0)`);
  logger.log(`📚 Swagger Documentation reachable at: /api/docs`);
}

bootstrap();
