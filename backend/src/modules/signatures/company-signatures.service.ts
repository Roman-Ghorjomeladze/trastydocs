import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { StorageProvider } from '../../integrations/storage/storage.interface.js';
import type { CreateCompanySignatureDto } from './dto/create-company-signature.dto.js';
import type { UpdateCompanySignatureDto } from './dto/update-company-signature.dto.js';

@Injectable()
export class CompanySignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject('STORAGE_PROVIDER')
    private readonly storage: StorageProvider,
  ) {}

  async create(companyId: string, userId: string, dto: CreateCompanySignatureDto) {
    const buffer = Buffer.from(dto.imageBase64, 'base64');
    const path = `company-signatures/${companyId}/${Date.now()}.png`;
    const imageUrl = await this.storage.upload(buffer, path, 'image/png');

    if (dto.isDefault) {
      await this.prisma.companySignature.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const signature = await this.prisma.companySignature.create({
      data: {
        companyId,
        userId,
        name: dto.name,
        imageUrl,
        isDefault: dto.isDefault,
      },
    });

    await this.audit.log({
      action: 'CREATE',
      entity: 'CompanySignature',
      entityId: signature.id,
      userId,
      companyId,
      details: { name: signature.name },
    });

    return signature;
  }

  async findAllForCompany(companyId: string) {
    return this.prisma.companySignature.findMany({
      where: { companyId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string, companyId: string) {
    const signature = await this.prisma.companySignature.findUnique({
      where: { id },
    });

    if (!signature || signature.companyId !== companyId) {
      throw new NotFoundException('Company signature not found');
    }

    return signature;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateCompanySignatureDto) {
    await this.findById(id, companyId);

    if (dto.isDefault) {
      await this.prisma.companySignature.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.companySignature.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });

    await this.audit.log({
      action: 'UPDATE',
      entity: 'CompanySignature',
      entityId: id,
      userId,
      companyId,
      details: { name: updated.name },
    });

    return updated;
  }

  async remove(id: string, companyId: string, userId: string) {
    const signature = await this.findById(id, companyId);

    try {
      await this.storage.delete(signature.imageUrl);
    } catch {
      // Non-critical
    }

    await this.prisma.companySignature.delete({ where: { id } });

    await this.audit.log({
      action: 'DELETE',
      entity: 'CompanySignature',
      entityId: id,
      userId,
      companyId,
      details: { name: signature.name },
    });

    return { message: 'Company signature deleted' };
  }
}
