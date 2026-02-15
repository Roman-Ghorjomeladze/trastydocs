import { Module } from '@nestjs/common';
import { SignaturesController } from './signatures.controller.js';
import { SignaturesService } from './signatures.service.js';
import { CompanySignaturesController } from './company-signatures.controller.js';
import { CompanySignaturesService } from './company-signatures.service.js';

@Module({
  controllers: [SignaturesController, CompanySignaturesController],
  providers: [SignaturesService, CompanySignaturesService],
  exports: [SignaturesService, CompanySignaturesService],
})
export class SignaturesModule {}
