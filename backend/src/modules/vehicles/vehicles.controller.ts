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
import { VehiclesService } from './vehicles.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CreateVehicleSchema } from './dto/create-vehicle.dto.js';
import { UpdateVehicleSchema } from './dto/update-vehicle.dto.js';
import type { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import type { VehicleType } from '@prisma/client';

@Controller('companies/:companyId/vehicles')
@UseGuards(JwtGuard, CompanyRoleGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateVehicleSchema)) dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(companyId, user.id, dto);
  }

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
    @Query('type') type?: VehicleType,
  ) {
    return this.vehiclesService.findAllForCompany(companyId, type);
  }

  @Get(':id')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.findById(id, companyId);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateVehicleSchema)) dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, companyId, user.id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.vehiclesService.remove(id, companyId, user.id);
  }
}
