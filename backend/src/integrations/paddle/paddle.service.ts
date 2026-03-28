import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  Paddle,
  Environment,
  EventName,
} from '@paddle/paddle-node-sdk';

@Injectable()
export class PaddleService implements OnModuleInit {
  private readonly logger = new Logger(PaddleService.name);
  private paddle: Paddle | null = null;
  private webhookSecret = '';
  private _isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('PADDLE_API_KEY');
    this.webhookSecret =
      this.configService.get<string>('PADDLE_WEBHOOK_SECRET') || '';

    const env = this.configService.get<string>('PADDLE_ENVIRONMENT') || 'sandbox';

    if (!apiKey || apiKey === 'your_api_key_here') {
      this.logger.warn('No valid PADDLE_API_KEY — payment features disabled');
      return;
    }

    this.paddle = new Paddle(apiKey, {
      environment:
        env === 'production' ? Environment.production : Environment.sandbox,
    });

    // SECURITY: Warn if webhook secret is missing — webhooks will be rejected
    if (!this.webhookSecret) {
      this.logger.warn(
        'PADDLE_WEBHOOK_SECRET is not set — all webhook signature verifications will fail. ' +
        'Set PADDLE_WEBHOOK_SECRET to enable webhook processing.',
      );
    }

    this._isConfigured = true;
    this.logger.log(`Paddle initialized in ${env} mode`);
  }

  get isConfigured(): boolean {
    return this._isConfigured;
  }

  get sdk(): Paddle | null {
    return this.paddle;
  }

  get eventNames(): typeof EventName {
    return EventName;
  }

  async cancelSubscription(
    subscriptionId: string,
    effectiveFrom: 'next_billing_period' | 'immediately' = 'next_billing_period',
  ): Promise<boolean> {
    if (!this.paddle) return false;

    try {
      await this.paddle.subscriptions.cancel(subscriptionId, {
        effectiveFrom,
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel subscription:', error);
      return false;
    }
  }

  async getSubscription(subscriptionId: string) {
    if (!this.paddle) return null;

    try {
      return await this.paddle.subscriptions.get(subscriptionId);
    } catch (error) {
      this.logger.error('Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Verify Paddle webhook signature.
   * Paddle-Signature header format: ts=123456;h1=abc123...
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;

    try {
      const parts = signature.split(';');
      const tsStr = parts.find((p) => p.startsWith('ts='))?.replace('ts=', '');
      const h1 = parts.find((p) => p.startsWith('h1='))?.replace('h1=', '');

      if (!tsStr || !h1) return false;

      const signedPayload = `${tsStr}:${rawBody}`;
      const computedHash = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'utf8'),
        Buffer.from(h1, 'utf8'),
      );
    } catch {
      return false;
    }
  }
}
