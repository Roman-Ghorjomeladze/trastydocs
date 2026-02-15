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
import { MembershipsService } from './memberships.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AddMemberSchema } from './dto/add-member.dto.js';
import { UpdateMemberSchema } from './dto/update-member.dto.js';
import type { AddMemberDto } from './dto/add-member.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';

@Controller('companies/:companyId/members')
@UseGuards(JwtGuard, CompanyRoleGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async addMember(
    @Param('companyId') companyId: string,
    @Body(new ZodValidationPipe(AddMemberSchema)) data: AddMemberDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.membershipsService.addMember(companyId, data, user.id);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  async findAll(@Param('companyId') companyId: string) {
    return this.membershipsService.findByCompany(companyId);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMemberSchema)) data: UpdateMemberDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.membershipsService.update(id, data, user.id, companyId);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.membershipsService.remove(id, user.id, companyId);
  }
}
