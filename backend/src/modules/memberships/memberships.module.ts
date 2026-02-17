import { Module } from '@nestjs/common';
import { MembershipsController } from './memberships.controller.js';
import { MembershipsService } from './memberships.service.js';
import { MailModule } from '../../integrations/mail/mail.module.js';

@Module({
  imports: [MailModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
