import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CompanySignaturesService } from './company-signatures.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CreateCompanySignatureSchema } from './dto/create-company-signature.dto.js';
import { UpdateCompanySignatureSchema } from './dto/update-company-signature.dto.js';
import type { CreateCompanySignatureDto } from './dto/create-company-signature.dto.js';
import type { UpdateCompanySignatureDto } from './dto/update-company-signature.dto.js';

@Controller('companies/:companyId/signatures')
@UseGuards(JwtGuard, CompanyRoleGuard)
export class CompanySignaturesController {
  constructor(private readonly companySignaturesService: CompanySignaturesService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateCompanySignatureSchema)) dto: CreateCompanySignatureDto,
  ) {
    return this.companySignaturesService.create(companyId, user.id, dto);
  }

  @Get()
  async findAll(@Param('companyId') companyId: string) {
    return this.companySignaturesService.findAllForCompany(companyId);
  }

  @Get(':id')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.companySignaturesService.findById(id, companyId);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateCompanySignatureSchema)) dto: UpdateCompanySignatureDto,
  ) {
    return this.companySignaturesService.update(id, companyId, user.id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.companySignaturesService.remove(id, companyId, user.id);
  }
}
