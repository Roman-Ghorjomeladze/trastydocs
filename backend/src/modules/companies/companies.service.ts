import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { LimitsService } from '../admin/limits.service.js';
import type { CreateCompanyDto } from './dto/create-company.dto.js';
import type { UpdateCompanyDto } from './dto/update-company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limitsService: LimitsService,
  ) {}

  /**
   * Create a company and auto-create an OWNER membership for the creator.
   * Uses a transaction to ensure atomicity.
   */
  async create(dto: CreateCompanyDto, userId: string) {
    await this.limitsService.checkLimit(userId, 'companies');

    const slug = await this.generateUniqueSlug(dto.name);

    const company = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const newCompany = await tx.company.create({
          data: {
            name: dto.name,
            slug,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            taxId: dto.taxId,
          },
        });

        await tx.membership.create({
          data: {
            userId,
            companyId: newCompany.id,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        });

        return newCompany;
      },
    );

    return company;
  }

  /**
   * List all companies where the user has an ACTIVE membership.
   */
  async findAllForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        company: true,
      },
    });

    const active = memberships.filter(
      (m: (typeof memberships)[number]) => m.company.isActive,
    );

    return active.map((m: (typeof memberships)[number]) => ({
      ...m.company,
      membership: {
        id: m.id,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      },
    }));
  }

  /**
   * Get a single company by ID. Throws if not found or inactive.
   */
  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });

    if (!company || !company.isActive) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  /**
   * Update a company. Regenerate slug if name changes.
   */
  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.findById(id);

    const data: Record<string, unknown> = { ...dto };

    if (dto.name && dto.name !== company.name) {
      data.slug = await this.generateUniqueSlug(dto.name);
    }

    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft-delete a company by setting isActive to false.
   */
  async remove(id: string) {
    await this.findById(id); // ensure exists

    return this.prisma.company.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Generate a unique slug from a company name.
   * If collision, appends a timestamp suffix.
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });

    const existing = await this.prisma.company.findUnique({
      where: { slug: baseSlug },
    });

    if (!existing) {
      return baseSlug;
    }

    // Append timestamp to make it unique
    const uniqueSlug = `${baseSlug}-${Date.now()}`;
    return uniqueSlug;
  }
}
