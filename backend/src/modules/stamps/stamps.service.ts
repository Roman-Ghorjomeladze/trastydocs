import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LimitsService } from '../admin/limits.service.js';
import type { StorageProvider } from '../../integrations/storage/storage.interface.js';
import { getStoragePrefix } from '../../integrations/storage/storage.module.js';
import type { CreateStampDto } from './dto/create-stamp.dto.js';
import type { UpdateStampDto } from './dto/update-stamp.dto.js';

@Injectable()
export class StampsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly limitsService: LimitsService,
    @Inject('STORAGE_PROVIDER')
    private readonly storage: StorageProvider,
  ) {}

  /**
   * Create a new stamp asset for a company.
   */
  async create(companyId: string, userId: string, dto: CreateStampDto) {
    await this.limitsService.checkLimit(userId, 'stamps', companyId);

    const buffer = Buffer.from(dto.imageBase64, 'base64');
    const prefix = getStoragePrefix();
    const storagePath = `${prefix}/users/${userId}/stamps/${Date.now()}.png`;
    const imageUrl = await this.storage.upload(buffer, storagePath, 'image/png');

    if (dto.isDefault) {
      await this.prisma.stampAsset.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const stamp = await this.prisma.stampAsset.create({
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
      entity: 'Stamp',
      entityId: stamp.id,
      userId,
      companyId,
      details: { name: stamp.name },
    });

    return stamp;
  }

  /**
   * List all stamps for a company.
   */
  async findAllForCompany(companyId: string) {
    return this.prisma.stampAsset.findMany({
      where: { companyId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get a single stamp by ID. Verifies company ownership.
   */
  async findById(id: string, companyId: string) {
    const stamp = await this.prisma.stampAsset.findUnique({
      where: { id },
    });

    if (!stamp || stamp.companyId !== companyId) {
      throw new NotFoundException('Stamp not found');
    }

    return stamp;
  }

  /**
   * Update a stamp (name/default).
   */
  async update(id: string, companyId: string, userId: string, dto: UpdateStampDto) {
    await this.findById(id, companyId);

    if (dto.isDefault) {
      await this.prisma.stampAsset.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.stampAsset.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });

    await this.audit.log({
      action: 'UPDATE',
      entity: 'Stamp',
      entityId: id,
      userId,
      companyId,
      details: { name: updated.name },
    });

    return updated;
  }

  /**
   * Delete a stamp and its stored image.
   */
  async remove(id: string, companyId: string, userId: string) {
    const stamp = await this.findById(id, companyId);

    try {
      await this.storage.delete(stamp.imageUrl);
    } catch {
      // Non-critical
    }

    await this.prisma.stampAsset.delete({ where: { id } });

    await this.audit.log({
      action: 'DELETE',
      entity: 'Stamp',
      entityId: id,
      userId,
      companyId,
      details: { name: stamp.name },
    });

    return { message: 'Stamp deleted' };
  }
}
