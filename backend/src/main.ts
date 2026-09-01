import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

  await app.listen(port);
  logger.log(`🚀 Ewa Derma Clinic Backend running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger Documentation reachable at: http://localhost:${port}/api/docs`);
}

bootstrap();
