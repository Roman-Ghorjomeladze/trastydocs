import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { QueryAuditSchema } from './dto/query-audit.dto.js';
import type { QueryAuditDto } from './dto/query-audit.dto.js';

@Controller('companies/:companyId/audit')
@UseGuards(JwtGuard, CompanyRoleGuard)
@Roles('OWNER', 'ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
    @Query(new ZodValidationPipe(QueryAuditSchema)) query: QueryAuditDto,
  ) {
    return this.auditService.findAll(companyId, query);
  }

  @Get('entity')
  async findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }
}
