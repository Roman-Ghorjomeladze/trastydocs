import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { StorageProvider } from '../../integrations/storage/storage.interface.js';
import type { CreateSignatureDto } from './dto/create-signature.dto.js';
import type { UpdateSignatureDto } from './dto/update-signature.dto.js';

@Injectable()
export class SignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject('STORAGE_PROVIDER')
    private readonly storage: StorageProvider,
  ) {}

  /**
   * Create a new signature asset for a user.
   */
  async create(userId: string, dto: CreateSignatureDto) {
    // Decode base64 and upload
    const buffer = Buffer.from(dto.imageBase64, 'base64');
    const path = `signatures/${userId}/${Date.now()}.png`;
    const imageUrl = await this.storage.upload(buffer, path, 'image/png');

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.signatureAsset.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const signature = await this.prisma.signatureAsset.create({
      data: {
        userId,
        name: dto.name,
        imageUrl,
        isDefault: dto.isDefault,
      },
    });

    await this.audit.log({
      action: 'CREATE',
      entity: 'Signature',
      entityId: signature.id,
      userId,
      details: { name: signature.name },
    });

    return signature;
  }

  /**
   * List all signatures for a user.
   */
  async findAllForUser(userId: string) {
    return this.prisma.signatureAsset.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get a single signature by ID. Verifies ownership.
   */
  async findById(id: string, userId: string) {
    const signature = await this.prisma.signatureAsset.findUnique({
      where: { id },
    });

    if (!signature || signature.userId !== userId) {
      throw new NotFoundException('Signature not found');
    }

    return signature;
  }

  /**
   * Update a signature (name/default).
   */
  async update(id: string, userId: string, dto: UpdateSignatureDto) {
    await this.findById(id, userId);

    if (dto.isDefault) {
      await this.prisma.signatureAsset.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.signatureAsset.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });

    await this.audit.log({
      action: 'UPDATE',
      entity: 'Signature',
      entityId: id,
      userId,
      details: { name: updated.name },
    });

    return updated;
  }

  /**
   * Delete a signature and its stored image.
   */
  async remove(id: string, userId: string) {
    const signature = await this.findById(id, userId);

    try {
      await this.storage.delete(signature.imageUrl);
    } catch {
      // Non-critical: file might already be deleted
    }

    await this.prisma.signatureAsset.delete({ where: { id } });

    await this.audit.log({
      action: 'DELETE',
      entity: 'Signature',
      entityId: id,
      userId,
      details: { name: signature.name },
    });

    return { message: 'Signature deleted' };
  }
}
