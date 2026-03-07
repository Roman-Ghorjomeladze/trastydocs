import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CreateDocumentSchema } from './dto/create-document.dto.js';
import type { CreateDocumentDto } from './dto/create-document.dto.js';
import type { DocumentStatus } from '@prisma/client';

@Controller('companies/:companyId/documents')
@UseGuards(JwtGuard, CompanyRoleGuard)
export class CompanyDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Preview the next auto-generated document number (read-only, no increment).
   * Must be defined BEFORE any `:id` param routes.
   */
  @Get('next-number')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async nextNumber(@Param('companyId') companyId: string) {
    const documentNumber =
      await this.documentsService.previewNextDocumentNumber(companyId);
    return { documentNumber };
  }

  /**
   * Check if a document number is available for this company.
   */
  @Get('check-number')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async checkNumber(
    @Param('companyId') companyId: string,
    @Query('number') number: string,
  ) {
    return this.documentsService.checkDocumentNumber(companyId, number);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateDocumentSchema)) dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(dto, user.id, companyId);
  }

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
    @Query('status') status?: DocumentStatus,
    @Query('statuses') statuses?: string,
    @Query('search') search?: string,
    @Query('buyerIds') buyerIds?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('vehiclePlate') vehiclePlate?: string,
  ) {
    return this.documentsService.findAll(companyId, {
      status,
      statuses: statuses ? (statuses.split(',') as DocumentStatus[]) : undefined,
      search,
      buyerIds: buyerIds ? buyerIds.split(',') : undefined,
      dateFrom,
      dateTo,
      vehiclePlate,
    });
  }
}
