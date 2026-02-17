import { Module } from '@nestjs/common';
import { StampsController } from './stamps.controller.js';
import { StampsService } from './stamps.service.js';
import { AdminModule } from '../admin/admin.module.js';

@Module({
  imports: [AdminModule],
  controllers: [StampsController],
  providers: [StampsService],
  exports: [StampsService],
})
export class StampsModule {}
