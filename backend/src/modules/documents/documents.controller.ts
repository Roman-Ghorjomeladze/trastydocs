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
import { DocumentsService } from './documents.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { UpdateDocumentSchema } from './dto/update-document.dto.js';
import { SendDocumentSchema } from './dto/send-document.dto.js';
import { UploadPdfSchema } from './dto/upload-pdf.dto.js';
import type { UpdateDocumentDto } from './dto/update-document.dto.js';
import type { SendDocumentDto } from './dto/send-document.dto.js';
import type { UploadPdfDto } from './dto/upload-pdf.dto.js';

@Controller('documents')
@UseGuards(JwtGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('dashboard/stats')
  async getDashboardStats(@CurrentUser() user: { id: string }) {
    return this.documentsService.getDashboardStats(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateDocumentSchema)) dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, dto, user.id);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.documentsService.remove(id, user.id);
  }

  @Patch(':id/upload-pdf')
  async uploadPdf(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UploadPdfSchema)) dto: UploadPdfDto,
  ) {
    return this.documentsService.uploadPdf(id, dto, user.id);
  }

  @Post(':id/send')
  async send(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(SendDocumentSchema)) dto: SendDocumentDto,
  ) {
    return this.documentsService.send(id, dto, user.id);
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const doc = await this.documentsService.findById(id);
    return this.documentsService.duplicate(id, user.id, doc.companyId);
  }

  @Post(':id/signatures')
  async applySignature(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body()
    data: {
      signatureId?: string;
      stampId?: string;
      pageNumber?: number;
      positionX: number;
      positionY: number;
      width: number;
      height: number;
    },
  ) {
    return this.documentsService.applySignature(id, data, user.id);
  }

  @Get(':id/signatures')
  async listSignatures(@Param('id') id: string) {
    return this.documentsService.listSignatures(id);
  }

  @Delete(':id/signatures/:signatureId')
  async removeSignature(@Param('signatureId') signatureId: string) {
    return this.documentsService.removeSignature(signatureId);
  }
}
