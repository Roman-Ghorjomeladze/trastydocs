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
import { CompaniesService } from './companies.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CreateCompanySchema } from './dto/create-company.dto.js';
import { UpdateCompanySchema } from './dto/update-company.dto.js';
import type { CreateCompanyDto } from './dto/create-company.dto.js';
import type { UpdateCompanyDto } from './dto/update-company.dto.js';

@Controller('companies')
@UseGuards(JwtGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateCompanySchema)) data: CreateCompanyDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.companiesService.create(data, user.id);
  }

  @Get()
  async findAll(@CurrentUser() user: { id: string }) {
    return this.companiesService.findAllForUser(user.id);
  }

  @Get(':id')
  @UseGuards(CompanyRoleGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  async findOne(@Param('id') id: string) {
    return this.companiesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(CompanyRoleGuard)
  @Roles('OWNER', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCompanySchema)) data: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(CompanyRoleGuard)
  @Roles('OWNER')
  async remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
