import { Injectable } from '@nestjs/common';
import { NbgService } from '../../integrations/nbg/nbg.service.js';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly nbg: NbgService) {}

  async getLatestRates() {
    return this.nbg.getLatestRates();
  }

  async getRate(currency: string, date?: string) {
    return this.nbg.getRate(currency, date);
  }

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: string,
  ) {
    return this.nbg.convert(amount, fromCurrency, toCurrency, date);
  }
}
