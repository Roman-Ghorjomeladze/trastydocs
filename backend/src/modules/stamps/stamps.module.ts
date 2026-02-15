import { Module } from '@nestjs/common';
import { StampsController } from './stamps.controller.js';
import { StampsService } from './stamps.service.js';

@Module({
  controllers: [StampsController],
  providers: [StampsService],
  exports: [StampsService],
})
export class StampsModule {}
