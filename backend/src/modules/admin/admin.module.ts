import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { RedisModule } from '../../integrations/redis/redis.module.js';
import { AdminController } from './admin.controller.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminPlansController } from './admin-plans.controller.js';
import { AdminCompaniesController } from './admin-companies.controller.js';
import { AdminDocumentsController } from './admin-documents.controller.js';
import { PlansController } from './plans.controller.js';
import { AdminService } from './admin.service.js';
import { LimitsService } from './limits.service.js';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminPlansController,
    AdminCompaniesController,
    AdminDocumentsController,
    PlansController,
  ],
  providers: [AdminService, LimitsService],
  exports: [LimitsService],
})
export class AdminModule {}
