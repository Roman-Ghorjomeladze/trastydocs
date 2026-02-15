import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateContactDto } from './dto/create-contact.dto.js';
import type { UpdateContactDto } from './dto/update-contact.dto.js';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new contact for a company.
   */
  async create(dto: CreateContactDto, companyId: string, userId?: string) {
    const contact = await this.prisma.contact.create({
      data: {
        companyId,
        type: dto.type,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        taxId: dto.taxId,
        bankAccounts: dto.bankAccounts as Prisma.InputJsonValue | undefined,
        contactPerson: dto.contactPerson,
        notes: dto.notes,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    if (userId) {
      await this.audit.log({
        action: 'CREATE',
        entity: 'Contact',
        entityId: contact.id,
        userId,
        companyId,
        details: { name: contact.name, type: contact.type },
      });
    }

    return contact;
  }

  /**
   * List contacts for a company, optionally filtered by type.
   */
  async findAll(
    companyId: string,
    type?: 'BUYER' | 'SELLER',
    search?: string,
  ) {
    const where: Prisma.ContactWhereInput = {
      companyId,
      isActive: true,
      ...(type && { type }),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single contact by ID. Throws if not found or inactive.
   */
  async findById(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact || !contact.isActive) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  /**
   * Update a contact.
   */
  async update(id: string, dto: UpdateContactDto, companyId: string, userId?: string) {
    const contact = await this.findById(id);

    if (contact.companyId !== companyId) {
      throw new NotFoundException('Contact not found');
    }

    const updated = await this.prisma.contact.update({
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
      },
    });

    if (userId) {
      await this.audit.log({
        action: 'UPDATE',
        entity: 'Contact',
        entityId: id,
        userId,
        companyId,
        details: { name: updated.name },
      });
    }

    return updated;
  }

  /**
   * Soft-delete a contact by setting isActive to false.
   */
  async remove(id: string, companyId: string, userId?: string) {
    const contact = await this.findById(id);

    if (contact.companyId !== companyId) {
      throw new NotFoundException('Contact not found');
    }

    const removed = await this.prisma.contact.update({
      where: { id },
      data: { isActive: false },
    });

    if (userId) {
      await this.audit.log({
        action: 'DELETE',
        entity: 'Contact',
        entityId: id,
        userId,
        companyId,
        details: { name: contact.name },
      });
    }

    return removed;
  }

  /**
   * Search contacts by name, email, or contact person.
   */
  async search(companyId: string, query: string) {
    return this.prisma.contact.findMany({
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
