import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('plans')
export class PlansController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async getActivePlans() {
    return this.adminService.getActivePlans();
  }
}
