import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateContractorDto } from './dto/create-contractor.dto.js';
import type { UpdateContractorDto } from './dto/update-contractor.dto.js';

@Injectable()
export class ContractorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new contractor for a company.
   */
  async create(dto: CreateContractorDto, companyId: string, userId?: string) {
    const contractor = await this.prisma.contractor.create({
      data: {
        companyId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        taxId: dto.taxId,
        bankAccounts: dto.bankAccounts as Prisma.InputJsonValue | undefined,
        contactPerson: dto.contactPerson,
        notes: dto.notes,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        nameTranslations: dto.nameTranslations as Prisma.InputJsonValue | undefined,
        addressTranslations: dto.addressTranslations as Prisma.InputJsonValue | undefined,
      },
    });

    if (userId) {
      await this.audit.log({
        action: 'CREATE',
        entity: 'Contractor',
        entityId: contractor.id,
        userId,
        companyId,
        details: { name: contractor.name },
      });
    }

    return contractor;
  }

  /**
   * List contractors for a company, optionally filtered.
   */
  async findAll(
    companyId: string,
    search?: string,
  ) {
    const where: Prisma.ContractorWhereInput = {
      companyId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.contractor.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single contractor by ID. Throws if not found or inactive.
   */
  async findById(id: string) {
    const contractor = await this.prisma.contractor.findUnique({
      where: { id },
    });

    if (!contractor || !contractor.isActive) {
      throw new NotFoundException('Contractor not found');
    }

    return contractor;
  }

  /**
   * Update a contractor.
   */
  async update(id: string, dto: UpdateContractorDto, companyId: string, userId?: string) {
    const contractor = await this.findById(id);

    if (contractor.companyId !== companyId) {
      throw new NotFoundException('Contractor not found');
    }

    const updated = await this.prisma.contractor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.bankAccounts !== undefined && {
          bankAccounts:
            dto.bankAccounts === null
              ? Prisma.JsonNull
              : (dto.bankAccounts as Prisma.InputJsonValue),
        }),
        ...(dto.contactPerson !== undefined && {
          contactPerson: dto.contactPerson,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.metadata !== undefined && {
          metadata:
            dto.metadata === null
              ? Prisma.JsonNull
              : (dto.metadata as Prisma.InputJsonValue),
        }),
        ...(dto.nameTranslations !== undefined && {
          nameTranslations:
            dto.nameTranslations === null
              ? Prisma.JsonNull
              : (dto.nameTranslations as Prisma.InputJsonValue),
        }),
        ...(dto.addressTranslations !== undefined && {
          addressTranslations:
            dto.addressTranslations === null
              ? Prisma.JsonNull
              : (dto.addressTranslations as Prisma.InputJsonValue),
        }),
      },
    });

    if (userId) {
      await this.audit.log({
        action: 'UPDATE',
        entity: 'Contractor',
        entityId: id,
        userId,
        companyId,
        details: { name: updated.name },
      });
    }

    return updated;
  }

  /**
   * Soft-delete a contractor by setting isActive to false.
   */
  async remove(id: string, companyId: string, userId?: string) {
    const contractor = await this.findById(id);

    if (contractor.companyId !== companyId) {
      throw new NotFoundException('Contractor not found');
    }

    const removed = await this.prisma.contractor.update({
      where: { id },
      data: { isActive: false },
    });

    if (userId) {
      await this.audit.log({
        action: 'DELETE',
        entity: 'Contractor',
        entityId: id,
        userId,
        companyId,
        details: { name: contractor.name },
      });
    }

    return removed;
  }

  /**
   * Search contractors by name, email, or contact person.
   */
  async search(companyId: string, query: string) {
    return this.prisma.contractor.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { contactPerson: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }
}
