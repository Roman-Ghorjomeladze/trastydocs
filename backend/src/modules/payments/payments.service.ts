import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { PaddleService } from '../../integrations/paddle/paddle.service.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paddleService: PaddleService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns Paddle price ID + customer email for frontend checkout.
   * Paddle checkout is opened client-side via Paddle.js.
   */
  async getCheckoutParams(userId: string, planId: string) {
    if (!this.paddleService.isConfigured) {
      throw new BadRequestException('Payment system is not configured');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new BadRequestException('Plan not found');
    if (!plan.paddlePriceId) {
      throw new BadRequestException(
        'This plan does not support online payment',
      );
    }
    if (plan.price === 0) {
      throw new BadRequestException('Cannot purchase a free plan');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    // Check if user already has this plan
    const currentSub = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    if (currentSub?.planId === planId && currentSub.status === 'ACTIVE') {
      throw new BadRequestException('You are already on this plan');
    }

    return {
      paddlePriceId: plan.paddlePriceId,
      customerEmail: user.email,
      customData: { user_id: user.id },
    };
  }

  async handleWebhook(eventType: string, data: any) {
    const eventId = data?.id
      ? `${eventType}_${data.id}`
      : `${eventType}_${Date.now()}`;

    // Idempotency check
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId },
    });
    if (existingEvent?.processed) {
      this.logger.log(`Webhook event already processed: ${eventId}`);
      return;
    }

    await this.prisma.webhookEvent.upsert({
      where: { eventId },
      create: { eventId, eventName: eventType, processed: false },
      update: {},
    });

    try {
      switch (eventType) {
        case 'subscription.activated':
        case 'subscription.created':
          await this.handleSubscriptionActivated(data);
          break;
        case 'subscription.updated':
          await this.handleSubscriptionUpdated(data);
          break;
        case 'subscription.canceled':
          await this.handleSubscriptionCanceled(data);
          break;
        case 'subscription.past_due':
          this.logger.warn(
            `Subscription ${data?.id} is past due — dunning started`,
          );
          break;
        case 'subscription.paused':
          await this.handleSubscriptionPaused(data);
          break;
        case 'subscription.resumed':
          await this.handleSubscriptionResumed(data);
          break;
        case 'transaction.completed':
          this.logger.log(`Transaction completed: ${data?.id}`);
          break;
        case 'transaction.payment_failed':
          this.logger.warn(`Transaction payment failed: ${data?.id}`);
          break;
        default:
          this.logger.log(`Unhandled webhook event: ${eventType}`);
      }

      await this.prisma.webhookEvent.update({
        where: { eventId },
        data: { processed: true },
      });
    } catch (error) {
      this.logger.error(`Error processing webhook ${eventType}:`, error);
      throw error;
    }
  }

  private async handleSubscriptionActivated(data: any) {
    const paddleSubscriptionId = data.id;
    const customData = data.customData || data.custom_data;
    const userId = customData?.user_id;

    if (!userId) {
      this.logger.warn(
        'subscription.activated webhook missing user_id in customData',
      );
      return;
    }

    // Find plan by Paddle price ID from subscription items
    const items = data.items || [];
    const priceId = items[0]?.price?.id;
    if (!priceId) {
      this.logger.warn('subscription.activated missing price ID in items');
      return;
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { paddlePriceId: priceId },
    });
    if (!plan) {
      this.logger.warn(`No plan found for Paddle price: ${priceId}`);
      return;
    }

    const nextBilledAt = data.nextBilledAt || data.next_billed_at;
    const customerId = data.customerId || data.customer_id;
    const managementUrls = data.managementUrls || data.management_urls;

    await this.prisma.$transaction(async (tx) => {
      // Cancel existing different subscription if upgrading
      const existingSub = await tx.userSubscription.findUnique({
        where: { userId },
      });

      if (
        existingSub?.paddleSubscriptionId &&
        existingSub.paddleSubscriptionId !== paddleSubscriptionId
      ) {
        try {
          await this.paddleService.cancelSubscription(
            existingSub.paddleSubscriptionId,
            'immediately',
          );
        } catch {
          // Previous subscription may already be cancelled
        }
      }

      await tx.userSubscription.upsert({
        where: { userId },
        update: {
          planId: plan.id,
          status: 'ACTIVE',
          paddleSubscriptionId,
          startedAt: new Date(),
          renewsAt: nextBilledAt ? new Date(nextBilledAt) : null,
          customerPortalUrl: managementUrls?.cancel || null,
        },
        create: {
          userId,
          planId: plan.id,
          status: 'ACTIVE',
          paddleSubscriptionId,
          renewsAt: nextBilledAt ? new Date(nextBilledAt) : null,
          customerPortalUrl: managementUrls?.cancel || null,
        },
      });

      if (customerId) {
        await tx.user.update({
          where: { id: userId },
          data: { paddleCustomerId: String(customerId) },
        });
      }
    });

    this.logger.log(
      `Subscription activated for user ${userId} on plan ${plan.displayName}`,
    );
  }

  private async handleSubscriptionUpdated(data: any) {
    const paddleSubscriptionId = data.id;

    const sub = await this.prisma.userSubscription.findUnique({
      where: { paddleSubscriptionId },
    });
    if (!sub) {
      this.logger.warn(
        `No subscription found for Paddle sub: ${paddleSubscriptionId}`,
      );
      return;
    }

    const status = this.mapPaddleStatus(data.status);
    const items = data.items || [];
    const priceId = items[0]?.price?.id;
    const nextBilledAt = data.nextBilledAt || data.next_billed_at;
    const managementUrls = data.managementUrls || data.management_urls;

    const plan = priceId
      ? await this.prisma.subscriptionPlan.findUnique({
          where: { paddlePriceId: priceId },
        })
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.userSubscription.update({
        where: { id: sub.id },
        data: {
          status,
          planId: plan?.id ?? sub.planId,
          renewsAt: nextBilledAt ? new Date(nextBilledAt) : null,
          customerPortalUrl: managementUrls?.cancel || sub.customerPortalUrl,
        },
      });
    });

    this.logger.log(
      `Subscription ${paddleSubscriptionId} updated → status: ${status}`,
    );
  }

  private async handleSubscriptionCanceled(data: any) {
    const paddleSubscriptionId = data.id;

    const sub = await this.prisma.userSubscription.findUnique({
      where: { paddleSubscriptionId },
    });
    if (!sub) {
      this.logger.warn(
        `No subscription found for Paddle sub: ${paddleSubscriptionId}`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const freePlan = await tx.subscriptionPlan.findUnique({
        where: { name: 'free' },
      });

      if (freePlan) {
        await tx.userSubscription.update({
          where: { id: sub.id },
          data: {
            planId: freePlan.id,
            status: 'ACTIVE',
            paddleSubscriptionId: null,
            paddleTransactionId: null,
            renewsAt: null,
            expiresAt: null,
            customerPortalUrl: null,
          },
        });
      } else {
        await tx.userSubscription.update({
          where: { id: sub.id },
          data: {
            status: 'CANCELLED',
            paddleSubscriptionId: null,
            paddleTransactionId: null,
            renewsAt: null,
            customerPortalUrl: null,
          },
        });
      }
    });

    this.logger.log(
      `Subscription ${paddleSubscriptionId} canceled → downgraded to free`,
    );
  }

  private async handleSubscriptionPaused(data: any) {
    const paddleSubscriptionId = data.id;
    const sub = await this.prisma.userSubscription.findUnique({
      where: { paddleSubscriptionId },
    });
    if (!sub) return;

    await this.prisma.userSubscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED' },
    });
  }

  private async handleSubscriptionResumed(data: any) {
    const paddleSubscriptionId = data.id;
    const sub = await this.prisma.userSubscription.findUnique({
      where: { paddleSubscriptionId },
    });
    if (!sub) return;

    await this.prisma.userSubscription.update({
      where: { id: sub.id },
      data: { status: 'ACTIVE' },
    });
  }

  async cancelUserSubscription(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    if (!sub) throw new BadRequestException('No active subscription');
    if (!sub.paddleSubscriptionId) {
      throw new BadRequestException('No Paddle subscription to cancel');
    }

    const success = await this.paddleService.cancelSubscription(
      sub.paddleSubscriptionId,
    );

    if (!success) {
      throw new BadRequestException('Failed to cancel subscription');
    }

    return { message: 'Subscription cancellation initiated' };
  }

  async getUserSubscriptionStatus(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!sub) return null;

    return {
      planId: sub.planId,
      planName: sub.plan.displayName,
      status: sub.status,
      hasActiveSubscription: !!sub.paddleSubscriptionId,
      renewsAt: sub.renewsAt,
      expiresAt: sub.expiresAt,
      customerPortalUrl: sub.customerPortalUrl,
    };
  }

  private mapPaddleStatus(
    paddleStatus: string,
  ): 'ACTIVE' | 'CANCELLED' | 'EXPIRED' {
    switch (paddleStatus) {
      case 'active':
      case 'trialing':
      case 'past_due':
        return 'ACTIVE';
      case 'canceled':
      case 'paused':
        return 'CANCELLED';
      default:
        return 'ACTIVE';
    }
  }
}
