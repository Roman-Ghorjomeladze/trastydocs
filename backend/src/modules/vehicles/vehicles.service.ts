import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import type { VehicleType } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Validate that a defaultTrailerId is valid for a truck.
   */
  private async validateDefaultTrailer(
    companyId: string,
    defaultTrailerId: string | null | undefined,
    vehicleType: string,
  ) {
    if (!defaultTrailerId) return;

    if (vehicleType !== 'TRUCK') {
      throw new BadRequestException('Default trailer can only be set for trucks');
    }

    const trailer = await this.prisma.vehicle.findUnique({
      where: { id: defaultTrailerId },
    });

    if (!trailer || trailer.companyId !== companyId) {
      throw new NotFoundException('Default trailer not found');
    }

    if (trailer.type !== 'TRAILER') {
      throw new BadRequestException('Selected vehicle is not a trailer');
    }
  }

  /**
   * Create a new vehicle for a company.
   */
  async create(companyId: string, userId: string, dto: CreateVehicleDto) {
    // Check for duplicate license plate within company
    const existing = await this.prisma.vehicle.findUnique({
      where: {
        companyId_licensePlate: {
          companyId,
          licensePlate: dto.licensePlate,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Vehicle with license plate "${dto.licensePlate}" already exists`,
      );
    }

    // Validate default trailer if provided
    await this.validateDefaultTrailer(companyId, dto.defaultTrailerId, dto.type);

    const vehicle = await this.prisma.vehicle.create({
      data: {
        companyId,
        model: dto.model,
        licensePlate: dto.licensePlate,
        type: dto.type,
        notes: dto.notes,
        ...(dto.defaultTrailerId && { defaultTrailerId: dto.defaultTrailerId }),
      },
      include: {
        defaultTrailer: true,
      },
    });

    await this.audit.log({
      action: 'CREATE',
      entity: 'Vehicle',
      entityId: vehicle.id,
      userId,
      companyId,
      details: {
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
        type: vehicle.type,
      },
    });

    return vehicle;
  }

  /**
   * List all vehicles for a company, optionally filtered by type.
   */
  async findAllForCompany(companyId: string, type?: VehicleType) {
    return this.prisma.vehicle.findMany({
      where: {
        companyId,
        ...(type && { type }),
      },
      include: {
        defaultTrailer: true,
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get a single vehicle by ID. Verifies company ownership.
   */
  async findById(id: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        defaultTrailer: true,
      },
    });

    if (!vehicle || vehicle.companyId !== companyId) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  /**
   * Update a vehicle.
   */
  async update(
    id: string,
    companyId: string,
    userId: string,
    dto: UpdateVehicleDto,
  ) {
    const current = await this.findById(id, companyId);

    // Check for duplicate license plate if updating it
    if (dto.licensePlate) {
      const existing = await this.prisma.vehicle.findUnique({
        where: {
          companyId_licensePlate: {
            companyId,
            licensePlate: dto.licensePlate,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Vehicle with license plate "${dto.licensePlate}" already exists`,
        );
      }
    }

    // Validate default trailer if provided
    if (dto.defaultTrailerId !== undefined) {
      await this.validateDefaultTrailer(companyId, dto.defaultTrailerId, current.type);
    }

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.licensePlate !== undefined && {
          licensePlate: dto.licensePlate,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.defaultTrailerId !== undefined && {
          defaultTrailerId: dto.defaultTrailerId,
        }),
      },
      include: {
        defaultTrailer: true,
      },
    });

    await this.audit.log({
      action: 'UPDATE',
      entity: 'Vehicle',
      entityId: id,
      userId,
      companyId,
      details: {
        model: updated.model,
        licensePlate: updated.licensePlate,
      },
    });

    return updated;
  }

  /**
   * Delete a vehicle.
   */
  async remove(id: string, companyId: string, userId: string) {
    const vehicle = await this.findById(id, companyId);

    await this.prisma.vehicle.delete({ where: { id } });

    await this.audit.log({
      action: 'DELETE',
      entity: 'Vehicle',
      entityId: id,
      userId,
      companyId,
      details: {
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
      },
    });

    return { message: 'Vehicle deleted' };
  }
}
