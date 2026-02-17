import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { AdminService } from './admin.service.js';

@Controller('admin/companies')
@UseGuards(JwtGuard, AdminGuard)
export class AdminCompaniesController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async getCompanies(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getCompanies({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
