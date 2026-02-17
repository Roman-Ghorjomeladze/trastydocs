import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { RedisService } from '../../integrations/redis/redis.service.js';
import { LimitsService } from './limits.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly limitsService: LimitsService,
  ) {}

  // ── Stats ──

  async getStats() {
    const [totalUsers, totalCompanies, totalDocuments, planStats] =
      await Promise.all([
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.company.count({ where: { isActive: true } }),
        this.prisma.document.count(),
        this.prisma.userSubscription.groupBy({
          by: ['planId'],
          _count: true,
        }),
      ]);

    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const subscriptionsByPlan = plans.map((plan) => ({
      planName: plan.displayName,
      count:
        planStats.find((s) => s.planId === plan.id)?._count ?? 0,
    }));

    return {
      totalUsers,
      totalCompanies,
      totalDocuments,
      subscriptionsByPlan,
    };
  }

  // ── Users ──

  async getUsers(params: { search?: string; planId?: string; page?: number; limit?: number }) {
    const { search, planId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (planId) {
      where.subscription = { planId };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          adminUser: { select: { id: true } },
          subscription: {
            include: { plan: { select: { id: true, name: true, displayName: true } } },
          },
          _count: {
            select: {
              memberships: true,
              documents: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        isAdmin: !!u.adminUser,
        adminUser: undefined,
      })),
      total,
      page,
      limit,
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        adminUser: { select: { id: true } },
        subscription: { include: { plan: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const [usage, creditBalance] = await Promise.all([
      this.limitsService.getUserUsage(userId),
      this.limitsService.getCreditBalance(userId),
    ]);

    return {
      ...user,
      isAdmin: !!user.adminUser,
      adminUser: undefined,
      usage,
      creditBalance,
    };
  }

  async updateUser(userId: string, data: { name?: string; isActive?: boolean }) {
    await this.prisma.user.findUniqueOrThrow({ where: { id: userId } }).catch(() => {
      throw new NotFoundException('User not found');
    });

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async toggleAdmin(userId: string, makeAdmin: boolean) {
    if (makeAdmin) {
      await this.prisma.adminUser.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    } else {
      await this.prisma.adminUser.deleteMany({ where: { userId } });
    }

    // Invalidate cache
    await this.redis.del(`admin:${userId}`);

    return { userId, isAdmin: makeAdmin };
  }

  // ── Credits ──

  async grantCredits(userId: string, grantedById: string, amount: number, reason?: string) {
    await this.prisma.user.findUniqueOrThrow({ where: { id: userId } }).catch(() => {
      throw new NotFoundException('User not found');
    });

    const transaction = await this.prisma.creditTransaction.create({
      data: {
        userId,
        grantedById,
        amount,
        reason,
      },
      include: {
        grantedBy: { select: { name: true, email: true } },
      },
    });

    return transaction;
  }

  async getCreditHistory(userId: string) {
    return this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        grantedBy: { select: { name: true, email: true } },
      },
    });
  }

  // ── Subscriptions ──

  async assignPlan(userId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    return this.prisma.userSubscription.upsert({
      where: { userId },
      update: { planId, status: 'ACTIVE', startedAt: new Date() },
      create: { userId, planId, status: 'ACTIVE' },
      include: { plan: true },
    });
  }

  // ── Plans ──

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getActivePlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createPlan(data: { name: string; displayName: string; price: number; limits: any; sortOrder?: number }) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictException('Plan with this name already exists');

    return this.prisma.subscriptionPlan.create({ data });
  }

  async updatePlan(id: string, data: { displayName?: string; price?: number; limits?: any; sortOrder?: number; isActive?: boolean }) {
    await this.prisma.subscriptionPlan.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException('Plan not found');
    });

    return this.prisma.subscriptionPlan.update({ where: { id }, data });
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });

    if (!plan) throw new NotFoundException('Plan not found');

    if (plan._count.subscriptions > 0) {
      // Soft delete — just mark inactive
      return this.prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.subscriptionPlan.delete({ where: { id } });
  }

  // ── Admin company/document lists ──

  async getCompanies(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { memberships: true, documents: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { companies, total, page, limit };
  }

  async getDocuments(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          documentNumber: true,
          status: true,
          createdAt: true,
          company: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { documents, total, page, limit };
  }
}
