import { Controller, Get, Patch, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AdminService } from './admin.service.js';
import { UpdateUserSchema, type UpdateUserDto, ToggleAdminSchema, type ToggleAdminDto } from './dto/update-user.dto.js';
import { GrantCreditsSchema, type GrantCreditsDto } from './dto/grant-credits.dto.js';
import { AssignPlanSchema, type AssignPlanDto } from './dto/assign-plan.dto.js';

@Controller('admin/users')
@UseGuards(JwtGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async getUsers(
    @Query('search') search?: string,
    @Query('planId') planId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      search,
      planId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch(':id/admin')
  async toggleAdmin(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ToggleAdminSchema)) dto: ToggleAdminDto,
  ) {
    return this.adminService.toggleAdmin(id, dto.isAdmin);
  }

  @Post(':id/credits')
  async grantCredits(
    @Param('id') id: string,
    @CurrentUser() admin: any,
    @Body(new ZodValidationPipe(GrantCreditsSchema)) dto: GrantCreditsDto,
  ) {
    return this.adminService.grantCredits(id, admin.id, dto.amount, dto.reason);
  }

  @Get(':id/credits')
  async getCreditHistory(@Param('id') id: string) {
    return this.adminService.getCreditHistory(id);
  }

  @Patch(':id/subscription')
  async assignPlan(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignPlanSchema)) dto: AssignPlanDto,
  ) {
    return this.adminService.assignPlan(id, dto.planId);
  }
}
