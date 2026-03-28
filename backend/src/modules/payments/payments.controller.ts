import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PaddleService } from '../../integrations/paddle/paddle.service.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paddleService: PaddleService,
  ) {}

  /**
   * Returns Paddle price ID + customer email for client-side checkout.
   * The frontend opens Paddle.Checkout.open() with these params.
   */
  @Post('checkout')
  @UseGuards(JwtGuard)
  async getCheckoutParams(
    @CurrentUser() user: { id: string },
    @Body() body: { planId: string },
  ) {
    if (!body.planId) throw new BadRequestException('planId is required');
    return this.paymentsService.getCheckoutParams(user.id, body.planId);
  }

  @Post('cancel')
  @UseGuards(JwtGuard)
  async cancelSubscription(@CurrentUser() user: { id: string }) {
    return this.paymentsService.cancelUserSubscription(user.id);
  }

  @Get('status')
  @UseGuards(JwtGuard)
  async getSubscriptionStatus(@CurrentUser() user: { id: string }) {
    return this.paymentsService.getUserSubscriptionStatus(user.id);
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('paddle-signature') signature: string,
  ) {
    if (!this.paddleService.isConfigured) {
      throw new BadRequestException('Paddle is not configured');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    const rawBodyStr = rawBody.toString();

    // Verify webhook signature
    const isValid = this.paddleService.verifyWebhookSignature(
      rawBodyStr,
      signature,
    );
    if (!isValid) {
      // SECURITY: Return 401 (not 400) for auth failures — Paddle expects this
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBodyStr);
    const eventType = payload.event_type;

    if (!eventType) {
      throw new BadRequestException('Missing event_type in payload');
    }

    await this.paymentsService.handleWebhook(eventType, payload.data);

    return { received: true };
  }
}
