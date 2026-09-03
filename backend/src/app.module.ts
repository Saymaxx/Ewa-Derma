import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicinesModule } from './medicines/medicines.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { ReportsModule } from './reports/reports.module';
import { BillingModule } from './billing/billing.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 500),
        },
      ],
    }),
    PrismaModule,
    CommonModule,
    AuditLogModule,
    AuthModule,
    AdminModule,
    DoctorsModule,
    PatientsModule,
    AppointmentsModule,
    MedicinesModule,
    ConsultationsModule,
    PrescriptionsModule,
    ReportsModule,
    BillingModule,
    SuppliersModule,
    InventoryModule,
    NotificationsModule,
  ],
})
export class AppModule {}
