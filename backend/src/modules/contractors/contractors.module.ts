import { Module } from '@nestjs/common';
import { ContractorsController } from './contractors.controller.js';
import { ContractorsService } from './contractors.service.js';
import { AdminModule } from '../admin/admin.module.js';

@Module({
  imports: [AdminModule],
  controllers: [ContractorsController],
  providers: [ContractorsService],
  exports: [ContractorsService],
})
export class ContractorsModule {}
