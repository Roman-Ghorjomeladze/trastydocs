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
import { SignaturesService } from './signatures.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CreateSignatureSchema } from './dto/create-signature.dto.js';
import { UpdateSignatureSchema } from './dto/update-signature.dto.js';
import type { CreateSignatureDto } from './dto/create-signature.dto.js';
import type { UpdateSignatureDto } from './dto/update-signature.dto.js';

@Controller('signatures')
@UseGuards(JwtGuard)
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateSignatureSchema)) dto: CreateSignatureDto,
  ) {
    return this.signaturesService.create(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: { id: string }) {
    return this.signaturesService.findAllForUser(user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.signaturesService.findById(id, user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateSignatureSchema)) dto: UpdateSignatureDto,
  ) {
    return this.signaturesService.update(id, user.id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.signaturesService.remove(id, user.id);
  }
}
