import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './integrations/redis/redis.module.js';
import { StorageModule } from './integrations/storage/storage.module.js';
import { MailModule } from './integrations/mail/mail.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { MembershipsModule } from './modules/memberships/memberships.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { ContractorsModule } from './modules/contractors/contractors.module.js';
import { SignaturesModule } from './modules/signatures/signatures.module.js';
import { StampsModule } from './modules/stamps/stamps.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { PaddleModule } from './integrations/paddle/paddle.module.js';
import { NbgModule } from './integrations/nbg/nbg.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    DatabaseModule,
    RedisModule,
    StorageModule,
    MailModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    MembershipsModule,
    DocumentsModule,
    ContractorsModule,
    SignaturesModule,
    StampsModule,
    VehiclesModule,
    AuditModule,
    AdminModule,
    PaddleModule,
    NbgModule,
    PaymentsModule,
    ExchangeRatesModule,
    FilesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
