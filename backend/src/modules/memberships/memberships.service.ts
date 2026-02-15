import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AddMemberDto } from './dto/add-member.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Add a member to a company by email.
   * Enforces: only OWNER can add as ADMIN, no duplicate memberships.
   */
  async addMember(companyId: string, dto: AddMemberDto, inviterId: string) {
    // Find the user to add
    const userToAdd = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!userToAdd) {
      throw new NotFoundException(`User with email "${dto.email}" not found`);
    }

    // Check for duplicate membership
    const existing = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: userToAdd.id,
          companyId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this company');
    }

    // Only OWNER can add as ADMIN
    if (dto.role === 'ADMIN') {
      const inviterMembership = await this.prisma.membership.findFirst({
        where: { userId: inviterId, companyId, status: 'ACTIVE' },
      });

      if (!inviterMembership || inviterMembership.role !== 'OWNER') {
        throw new ForbiddenException('Only the owner can add admin members');
      }
    }

    const membership = await this.prisma.membership.create({
      data: {
        userId: userToAdd.id,
        companyId,
        role: dto.role,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
    });

    await this.audit.log({
      action: 'CREATE',
      entity: 'Membership',
      entityId: membership.id,
      userId: inviterId,
      companyId,
      details: { email: dto.email, role: dto.role },
    });

    return membership;
  }

  /**
   * List all members of a company.
   */
  async findByCompany(companyId: string) {
    return this.prisma.membership.findMany({
      where: { companyId },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  /**
   * Update a membership (role or status).
   * Enforces role hierarchy:
   *  - Cannot change an OWNER's role
   *  - Only OWNER can promote to/modify ADMIN
   */
  async update(
    membershipId: string,
    dto: UpdateMemberDto,
    actingUserId: string,
    companyId: string,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership || membership.companyId !== companyId) {
      throw new NotFoundException('Membership not found');
    }

    // Cannot change an OWNER's role
    if (membership.role === 'OWNER' && dto.role && dto.role !== 'OWNER') {
      throw new ForbiddenException("Cannot change an owner's role");
    }

    // Only OWNER can promote to ADMIN or modify ADMIN membership
    if (dto.role === 'ADMIN' || membership.role === 'ADMIN') {
      const actingMembership = await this.prisma.membership.findFirst({
        where: { userId: actingUserId, companyId, status: 'ACTIVE' },
      });

      if (!actingMembership || actingMembership.role !== 'OWNER') {
        throw new ForbiddenException(
          'Only the owner can modify admin memberships',
        );
      }
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        ...(dto.role && { role: dto.role }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
    });

    await this.audit.log({
      action: 'UPDATE',
      entity: 'Membership',
      entityId: membershipId,
      userId: actingUserId,
      companyId,
      details: { role: dto.role, status: dto.status },
    });

    return updated;
  }

  /**
   * Remove a member from a company.
   * Self-removal is allowed (except the last OWNER).
   * Non-self requires OWNER/ADMIN; ADMINs cannot remove OWNERs or other ADMINs.
   */
  async remove(
    membershipId: string,
    actingUserId: string,
    companyId: string,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!membership || membership.companyId !== companyId) {
      throw new NotFoundException('Membership not found');
    }

    const isSelfRemoval = membership.userId === actingUserId;

    if (isSelfRemoval) {
      // Cannot self-remove if last OWNER
      if (membership.role === 'OWNER') {
        const ownerCount = await this.prisma.membership.count({
          where: {
            companyId,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        });

        if (ownerCount <= 1) {
          throw new BadRequestException(
            'Cannot leave company as the last owner. Transfer ownership first.',
          );
        }
      }
    } else {
      // Non-self removal: check acting user's role
      const actingMembership = await this.prisma.membership.findFirst({
        where: { userId: actingUserId, companyId, status: 'ACTIVE' },
      });

      if (!actingMembership) {
        throw new ForbiddenException('You are not a member of this company');
      }

      // Must be OWNER or ADMIN to remove others
      if (
        actingMembership.role !== 'OWNER' &&
        actingMembership.role !== 'ADMIN'
      ) {
        throw new ForbiddenException(
          'Only owners and admins can remove members',
        );
      }

      // ADMINs cannot remove OWNERs or other ADMINs
      if (actingMembership.role === 'ADMIN') {
        if (
          membership.role === 'OWNER' ||
          membership.role === 'ADMIN'
        ) {
          throw new ForbiddenException(
            'Admins cannot remove owners or other admins',
          );
        }
      }
    }

    await this.prisma.membership.delete({
      where: { id: membershipId },
    });

    await this.audit.log({
      action: 'DELETE',
      entity: 'Membership',
      entityId: membershipId,
      userId: actingUserId,
      companyId,
      details: { removedUser: membership.user?.email },
    });

    return { message: 'Member removed successfully' };
  }
}
