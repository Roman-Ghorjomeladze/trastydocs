import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service.js';
import { RedisService } from '../../integrations/redis/redis.service.js';
import { LimitsService } from '../admin/limits.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface GoogleProfile {
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  // Token expiration in seconds
  private readonly accessTokenExpSec: number;
  private readonly refreshTokenExpSec: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly limitsService: LimitsService,
    private readonly membershipsService: MembershipsService,
  ) {
    this.accessTokenExpSec =
      this.configService.get<number>('JWT_ACCESS_EXPIRES_SEC') || 900; // 15 min
    this.refreshTokenExpSec =
      this.configService.get<number>('JWT_REFRESH_EXPIRES_SEC') ||
      7 * 24 * 60 * 60; // 7 days
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    // Auto-assign free plan to new user
    await this.assignFreePlan(user.id);

    // Grant welcome credits (temporary promotion)
    await this.grantWelcomeCredits(user.id);

    // Auto-accept any pending company invitations for this email
    try {
      await this.membershipsService.acceptPendingInvitations(
        user.id,
        user.email,
      );
    } catch {
      // Non-critical: user can still use the platform
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessToken = this.jwtService.sign(
      { sub: userId, email, jti: accessJti },
      { expiresIn: this.accessTokenExpSec },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti: refreshJti, type: 'refresh' },
      { expiresIn: this.refreshTokenExpSec },
    );

    // Store refresh token JTI in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshJti,
        userId,
        expiresAt: new Date(Date.now() + this.refreshTokenExpSec * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if refresh token exists and is not revoked
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: payload.jti },
      });

      if (!storedToken || storedToken.revoked) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      // Revoke old refresh token (rotation)
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });

      // Fetch user to verify they still exist and are active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new token pair
      const tokens = await this.generateTokenPair(user.id, user.email);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, jti: string, refreshToken?: string) {
    // Blacklist the access token in Redis with TTL matching access token expiry
    await this.redisService.setex(
      `blacklist:${jti}`,
      this.accessTokenExpSec,
      '1',
    );

    // Also persist to PostgreSQL as fallback
    await this.prisma.tokenBlacklist.create({
      data: {
        jti,
        tokenType: 'ACCESS',
        userId,
        expiresAt: new Date(Date.now() + this.accessTokenExpSec * 1000),
      },
    });

    // If refresh token provided, revoke it
    if (refreshToken) {
      try {
        const payload = this.jwtService.verify(refreshToken);
        if (payload.jti) {
          await this.prisma.refreshToken.updateMany({
            where: { token: payload.jti },
            data: { revoked: true },
          });
        }
      } catch {
        // Ignore invalid refresh tokens during logout
      }
    }
  }

  async googleLogin(profile: GoogleProfile) {
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      // Create new user from Google profile
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          avatarUrl: profile.picture,
          googleId: profile.email,
        },
      });

      // Auto-assign free plan to new user
      await this.assignFreePlan(user.id);

      // Grant welcome credits (temporary promotion)
      await this.grantWelcomeCredits(user.id);

      // Auto-accept any pending company invitations for this email
      try {
        await this.membershipsService.acceptPendingInvitations(
          user.id,
          user.email,
        );
      } catch {
        // Non-critical
      }
    } else if (!user.googleId) {
      // Link Google account to existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.email,
          avatarUrl: user.avatarUrl || profile.picture,
        },
      });
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async getProfile(userId: string) {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check admin status
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { userId },
    });

    // Get subscription and limits info
    const limitsAndUsage = await this.limitsService.getLimitsAndUsage(userId);

    return {
      ...user,
      isAdmin: !!adminUser,
      subscription: limitsAndUsage.plan
        ? {
            planName: limitsAndUsage.plan.displayName,
            planId: limitsAndUsage.plan.id,
            paddlePriceId: limitsAndUsage.plan.paddlePriceId ?? null,
            limits: limitsAndUsage.limits,
            status: 'ACTIVE',
          }
        : null,
      usage: limitsAndUsage.usage,
      creditBalance: limitsAndUsage.creditBalance,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found or no password set');
    }

    const isValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password changed successfully' };
  }

  private async grantWelcomeCredits(userId: string) {
    try {
      await this.prisma.creditTransaction.create({
        data: {
          userId,
          grantedById: userId,
          amount: 1000,
          reason: 'Welcome bonus – temporary promotion',
        },
      });
    } catch {
      // Non-critical: user can still use the platform without credits
    }
  }

  private async assignFreePlan(userId: string) {
    try {
      const freePlan = await this.prisma.subscriptionPlan.findUnique({
        where: { name: 'free' },
      });

      if (freePlan) {
        await this.prisma.userSubscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: 'ACTIVE',
          },
        });
      }
    } catch {
      // Non-critical: user can still use the platform with default limits
    }
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
