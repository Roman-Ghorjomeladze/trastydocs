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
import { StampsService } from './stamps.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CreateStampSchema } from './dto/create-stamp.dto.js';
import { UpdateStampSchema } from './dto/update-stamp.dto.js';
import type { CreateStampDto } from './dto/create-stamp.dto.js';
import type { UpdateStampDto } from './dto/update-stamp.dto.js';

@Controller('companies/:companyId/stamps')
@UseGuards(JwtGuard, CompanyRoleGuard)
export class StampsController {
  constructor(private readonly stampsService: StampsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateStampSchema)) dto: CreateStampDto,
  ) {
    return this.stampsService.create(companyId, user.id, dto);
  }

  @Get()
  async findAll(@Param('companyId') companyId: string) {
    return this.stampsService.findAllForCompany(companyId);
  }

  @Get(':id')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.stampsService.findById(id, companyId);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateStampSchema)) dto: UpdateStampDto,
  ) {
    return this.stampsService.update(id, companyId, user.id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.stampsService.remove(id, companyId, user.id);
  }
}
