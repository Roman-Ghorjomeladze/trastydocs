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
import { ContactsService } from './contacts.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CreateContactSchema } from './dto/create-contact.dto.js';
import { UpdateContactSchema } from './dto/update-contact.dto.js';
import type { CreateContactDto } from './dto/create-contact.dto.js';
import type { UpdateContactDto } from './dto/update-contact.dto.js';

@Controller('companies/:companyId/contacts')
@UseGuards(JwtGuard, CompanyRoleGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async create(
    @Param('companyId') companyId: string,
    @Body(new ZodValidationPipe(CreateContactSchema)) data: CreateContactDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.contactsService.create(data, companyId, user.id);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  async findAll(
    @Param('companyId') companyId: string,
    @Query('search') search?: string,
  ) {
    return this.contactsService.findAll(companyId, search);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  async findOne(
    @Param('id') id: string,
  ) {
    return this.contactsService.findById(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateContactSchema)) data: UpdateContactDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.contactsService.update(id, data, companyId, user.id);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contactsService.remove(id, companyId, user.id);
  }
}
