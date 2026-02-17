import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { RedisService } from '../../integrations/redis/redis.service.js';

const ADMIN_CACHE_PREFIX = 'admin:';
const ADMIN_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      return false;
    }

    // Check Redis cache first
    const cacheKey = `${ADMIN_CACHE_PREFIX}${user.id}`;
    const cached = await this.redis.get(cacheKey);

    if (cached !== null) {
      return cached === '1';
    }

    // Cache miss — check database
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { userId: user.id },
    });

    const isAdmin = !!adminUser;

    // Cache the result
    await this.redis.setex(cacheKey, ADMIN_CACHE_TTL, isAdmin ? '1' : '0');

    return isAdmin;
  }
}
