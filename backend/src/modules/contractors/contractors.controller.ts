import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContractorsService } from './contractors.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CreateContractorSchema } from './dto/create-contractor.dto.js';
import { UpdateContractorSchema } from './dto/update-contractor.dto.js';
import type { CreateContractorDto } from './dto/create-contractor.dto.js';
import type { UpdateContractorDto } from './dto/update-contractor.dto.js';

@Controller('companies/:companyId/contractors')
@UseGuards(JwtGuard, CompanyRoleGuard)
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async create(
    @Param('companyId') companyId: string,
    @Body(new ZodValidationPipe(CreateContractorSchema)) data: CreateContractorDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.contractorsService.create(data, companyId, user.id);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  async findAll(
    @Param('companyId') companyId: string,
    @Query('search') search?: string,
  ) {
    return this.contractorsService.findAll(companyId, search);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  async findOne(
    @Param('id') id: string,
  ) {
    return this.contractorsService.findById(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateContractorSchema)) data: UpdateContractorDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.contractorsService.update(id, data, companyId, user.id);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contractorsService.remove(id, companyId, user.id);
  }
}
