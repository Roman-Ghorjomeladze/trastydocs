import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { MailService } from '../../integrations/mail/mail.service.js';
import type { AddMemberDto } from './dto/add-member.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Add a member to a company by email.
   * If the user exists, creates an ACTIVE membership.
   * If not, creates a PendingInvitation and sends an email invite.
   */
  async addMember(companyId: string, dto: AddMemberDto, inviterId: string) {
    // Only OWNER can add as ADMIN
    if (dto.role === 'ADMIN') {
      const inviterMembership = await this.prisma.membership.findFirst({
        where: { userId: inviterId, companyId, status: 'ACTIVE' },
      });

      if (!inviterMembership || inviterMembership.role !== 'OWNER') {
        throw new ForbiddenException('Only the owner can add admin members');
      }
    }

    const userToAdd = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (userToAdd) {
      // ── User exists → add directly ──
      const existing = await this.prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId: userToAdd.id,
            companyId,
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          'User is already a member of this company',
        );
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

      return { type: 'added' as const, membership };
    }

    // ── User doesn't exist → create invitation ──
    const existingInvite = await this.prisma.pendingInvitation.findUnique({
      where: { email_companyId: { email: dto.email, companyId } },
    });

    if (existingInvite) {
      throw new BadRequestException(
        'An invitation has already been sent to this email',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
    });

    const invitation = await this.prisma.pendingInvitation.create({
      data: {
        email: dto.email,
        companyId,
        role: dto.role,
        invitedBy: inviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send invitation email
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/register?invite=${invitation.token}`;

    try {
      await this.mail.sendInvite(
        dto.email,
        inviter?.name || 'A team member',
        company?.name || 'a company',
        inviteUrl,
      );
    } catch (err) {
      console.error('Failed to send invitation email:', err);
    }

    await this.audit.log({
      action: 'CREATE',
      entity: 'PendingInvitation',
      entityId: invitation.id,
      userId: inviterId,
      companyId,
      details: { email: dto.email, role: dto.role },
    });

    return {
      type: 'invited' as const,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
    };
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
   * List pending invitations for a company.
   */
  async findInvitationsByCompany(companyId: string) {
    return this.prisma.pendingInvitation.findMany({
      where: {
        companyId,
        expiresAt: { gt: new Date() },
      },
      include: {
        inviter: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel a pending invitation.
   */
  async cancelInvitation(
    invitationId: string,
    actingUserId: string,
    companyId: string,
  ) {
    const invitation = await this.prisma.pendingInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.companyId !== companyId) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.pendingInvitation.delete({
      where: { id: invitationId },
    });

    await this.audit.log({
      action: 'DELETE',
      entity: 'PendingInvitation',
      entityId: invitationId,
      userId: actingUserId,
      companyId,
      details: { email: invitation.email },
    });

    return { message: 'Invitation cancelled successfully' };
  }

  /**
   * Accept all pending invitations for a given email (called on registration).
   */
  async acceptPendingInvitations(userId: string, email: string) {
    const invitations = await this.prisma.pendingInvitation.findMany({
      where: {
        email,
        expiresAt: { gt: new Date() },
      },
    });

    for (const invite of invitations) {
      // Check if membership already exists (shouldn't, but be safe)
      const existing = await this.prisma.membership.findUnique({
        where: {
          userId_companyId: { userId, companyId: invite.companyId },
        },
      });

      if (!existing) {
        await this.prisma.membership.create({
          data: {
            userId,
            companyId: invite.companyId,
            role: invite.role,
            status: 'ACTIVE',
          },
        });
      }
    }

    // Delete all invitations for this email (including expired ones)
    await this.prisma.pendingInvitation.deleteMany({
      where: { email },
    });

    return invitations.length;
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
