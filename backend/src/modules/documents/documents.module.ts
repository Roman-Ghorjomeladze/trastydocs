import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller.js';
import { CompanyDocumentsController } from './company-documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { MailModule } from '../../integrations/mail/mail.module.js';
import { AdminModule } from '../admin/admin.module.js';

@Module({
  imports: [MailModule, AdminModule],
  controllers: [DocumentsController, CompanyDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
