import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AdminService } from './admin.service.js';
import { CreatePlanSchema, type CreatePlanDto } from './dto/create-plan.dto.js';
import { UpdatePlanSchema, type UpdatePlanDto } from './dto/update-plan.dto.js';

@Controller('admin/plans')
@UseGuards(JwtGuard, AdminGuard)
export class AdminPlansController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async getPlans() {
    return this.adminService.getPlans();
  }

  @Post()
  async createPlan(
    @Body(new ZodValidationPipe(CreatePlanSchema)) dto: CreatePlanDto,
  ) {
    return this.adminService.createPlan(dto);
  }

  @Patch(':id')
  async updatePlan(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePlanSchema)) dto: UpdatePlanDto,
  ) {
    return this.adminService.updatePlan(id, dto);
  }

  @Delete(':id')
  async deletePlan(@Param('id') id: string) {
    return this.adminService.deletePlan(id);
  }
}
