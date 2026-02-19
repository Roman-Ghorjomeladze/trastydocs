import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';

@Controller('exchange-rates')
@UseGuards(JwtGuard)
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  /**
   * GET /exchange-rates/latest
   * Returns the latest exchange rates for all currencies.
   */
  @Get('latest')
  async getLatest() {
    return this.service.getLatestRates();
  }

  /**
   * GET /exchange-rates?currency=USD&date=2026-02-19
   * Returns the rate for a specific currency on a specific date.
   */
  @Get()
  async getRate(
    @Query('currency') currency?: string,
    @Query('date') date?: string,
  ) {
    if (currency) {
      return this.service.getRate(currency, date);
    }
    return this.service.getLatestRates();
  }

  /**
   * GET /exchange-rates/convert?amount=100&from=USD&to=GEL&date=2026-02-19
   * Convert an amount between currencies.
   */
  @Get('convert')
  async convert(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date?: string,
  ) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !from || !to) {
      return { error: 'Invalid parameters. Required: amount, from, to' };
    }
    return this.service.convert(numAmount, from, to, date);
  }
}
