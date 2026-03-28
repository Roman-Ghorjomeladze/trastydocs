import { Injectable, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export interface PlanLimits {
  maxCompanies: number;
  maxContractors: number;
  maxDocuments: number;
  maxSignaturesPerCompany: number;
  maxStampsPerCompany: number;
}

export interface UsageCounts {
  companies: number;
  contractors: number;
  documents: number;
}

const DEFAULT_LIMITS: PlanLimits = {
  maxCompanies: 3,
  maxContractors: 10,
  maxDocuments: 50,
  maxSignaturesPerCompany: 1,
  maxStampsPerCompany: 1,
};

@Injectable()
export class LimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserLimits(userId: string): Promise<PlanLimits> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription || !subscription.plan) {
      return DEFAULT_LIMITS;
    }

    return subscription.plan.limits as unknown as PlanLimits;
  }

  async getUserUsage(userId: string): Promise<UsageCounts> {
    // Get all company IDs where user is an ACTIVE member
    const memberships = await this.prisma.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { companyId: true },
    });
    const companyIds = memberships.map((m) => m.companyId);

    const [companies, contractors, documents] = await Promise.all([
      this.prisma.membership.count({
        where: { userId, status: 'ACTIVE', company: { isActive: true } },
      }),
      this.prisma.contractor.count({
        where: { companyId: { in: companyIds }, isActive: true },
      }),
      this.prisma.document.count({
        where: { companyId: { in: companyIds }, status: { not: 'CANCELLED' } },
      }),
    ]);

    return { companies, contractors, documents };
  }

  async getCreditBalance(userId: string): Promise<number> {
    const result = await this.prisma.creditTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  async getLimitsAndUsage(userId: string) {
    const [limits, usage, creditBalance] = await Promise.all([
      this.getUserLimits(userId),
      this.getUserUsage(userId),
      this.getCreditBalance(userId),
    ]);

    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    return {
      limits,
      usage,
      creditBalance,
      plan: subscription?.plan ?? null,
    };
  }

  /**
   * Check resource limits within a serializable transaction to prevent
   * race conditions where parallel requests bypass limits.
   */
  async checkLimit(
    userId: string,
    resource: string,
    companyId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check credits first — only positive balance bypasses limits
      const creditResult = await tx.creditTransaction.aggregate({
        where: { userId },
        _sum: { amount: true },
      });
      const creditBalance = creditResult._sum.amount ?? 0;
      if (creditBalance > 0) {
        return;
      }

      const subscription = await tx.userSubscription.findUnique({
        where: { userId },
        include: { plan: true },
      });
      const limits = subscription?.plan?.limits
        ? (subscription.plan.limits as unknown as PlanLimits)
        : DEFAULT_LIMITS;
      const planName = subscription?.plan?.displayName ?? 'Free';

      switch (resource) {
        case 'companies': {
          if (limits.maxCompanies === -1) return;
          const count = await tx.membership.count({
            where: { userId, status: 'ACTIVE', company: { isActive: true } },
          });
          if (count >= limits.maxCompanies) {
            throw new ForbiddenException({
              code: 'PLAN_LIMIT_REACHED',
              message: `You have reached the maximum number of companies (${limits.maxCompanies}) for your ${planName} plan`,
              resource: 'companies',
              currentUsage: count,
              limit: limits.maxCompanies,
              planName,
            });
          }
          break;
        }

        case 'contractors': {
          if (limits.maxContractors === -1) return;
          const memberships = await tx.membership.findMany({
            where: { userId, status: 'ACTIVE' },
            select: { companyId: true },
          });
          const cIds = memberships.map((m) => m.companyId);
          const count = await tx.contractor.count({
            where: { companyId: { in: cIds }, isActive: true },
          });
          if (count >= limits.maxContractors) {
            throw new ForbiddenException({
              code: 'PLAN_LIMIT_REACHED',
              message: `You have reached the maximum number of contractors (${limits.maxContractors}) for your ${planName} plan`,
              resource: 'contractors',
              currentUsage: count,
              limit: limits.maxContractors,
              planName,
            });
          }
          break;
        }

        case 'documents': {
          if (limits.maxDocuments === -1) return;
          const memberships = await tx.membership.findMany({
            where: { userId, status: 'ACTIVE' },
            select: { companyId: true },
          });
          const cIds = memberships.map((m) => m.companyId);
          const count = await tx.document.count({
            where: { companyId: { in: cIds }, status: { not: 'CANCELLED' } },
          });
          if (count >= limits.maxDocuments) {
            throw new ForbiddenException({
              code: 'PLAN_LIMIT_REACHED',
              message: `You have reached the maximum number of documents (${limits.maxDocuments}) for your ${planName} plan`,
              resource: 'documents',
              currentUsage: count,
              limit: limits.maxDocuments,
              planName,
            });
          }
          break;
        }

        case 'signatures': {
          if (limits.maxSignaturesPerCompany === -1 || !companyId) return;
          const count = await tx.companySignature.count({
            where: { companyId },
          });
          if (count >= limits.maxSignaturesPerCompany) {
            throw new ForbiddenException({
              code: 'PLAN_LIMIT_REACHED',
              message: `You have reached the maximum number of signatures per company (${limits.maxSignaturesPerCompany}) for your ${planName} plan`,
              resource: 'signatures',
              currentUsage: count,
              limit: limits.maxSignaturesPerCompany,
              planName,
            });
          }
          break;
        }

        case 'stamps': {
          if (limits.maxStampsPerCompany === -1 || !companyId) return;
          const count = await tx.stampAsset.count({
            where: { companyId },
          });
          if (count >= limits.maxStampsPerCompany) {
            throw new ForbiddenException({
              code: 'PLAN_LIMIT_REACHED',
              message: `You have reached the maximum number of stamps per company (${limits.maxStampsPerCompany}) for your ${planName} plan`,
              resource: 'stamps',
              currentUsage: count,
              limit: limits.maxStampsPerCompany,
              planName,
            });
          }
          break;
        }
      }
    });
  }
}
