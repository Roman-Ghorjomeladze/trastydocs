import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';

interface NbgCurrency {
  code: string;
  quantity: number;
  rateFormated: string;
  diffFormated: string;
  rate: number;
  name: string;
  diff: number;
  date: string;
  validFromDate: string;
}

interface NbgResponse {
  date: string;
  currencies: NbgCurrency[];
}

@Injectable()
export class NbgService implements OnModuleInit {
  private readonly logger = new Logger(NbgService.name);
  private readonly NBG_API_URL =
    'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Seed today's rates on startup if missing
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existing = await this.prisma.exchangeRate.findFirst({
        where: { date: today },
      });

      if (!existing) {
        this.logger.log('No exchange rates for today, fetching from NBG...');
        await this.fetchAndStore();
      } else {
        this.logger.log('Exchange rates for today already exist');
      }
    } catch (err) {
      this.logger.warn('Failed to seed exchange rates on startup:', err);
    }
  }

  /**
   * Cron job: fetch rates every weekday at 10:00 AM (Tbilisi time).
   * NBG typically publishes around 10 AM.
   */
  @Cron('0 10 * * 1-5')
  async handleCron() {
    this.logger.log('Cron: fetching exchange rates from NBG...');
    await this.fetchAndStore();
  }

  /**
   * Fetch exchange rates from NBG API and store them in the database.
   * @param dateStr Optional date in YYYY-MM-DD format; defaults to today.
   */
  async fetchAndStore(dateStr?: string): Promise<void> {
    const date = dateStr || this.formatDate(new Date());

    try {
      const url = `${this.NBG_API_URL}?date=${date}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`NBG API returned ${response.status}`);
      }

      const data: NbgResponse[] = await response.json();

      if (!data || !data.length || !data[0].currencies) {
        this.logger.warn(`No currency data from NBG for ${date}`);
        return;
      }

      const currencies = data[0].currencies;
      const rateDate = new Date(date);
      rateDate.setHours(0, 0, 0, 0);

      let upsertedCount = 0;

      for (const cur of currencies) {
        try {
          await this.prisma.exchangeRate.upsert({
            where: {
              date_base_currency: {
                date: rateDate,
                base: 'GEL',
                currency: cur.code,
              },
            },
            create: {
              date: rateDate,
              base: 'GEL',
              currency: cur.code,
              rate: cur.rate,
              quantity: cur.quantity,
            },
            update: {
              rate: cur.rate,
              quantity: cur.quantity,
            },
          });
          upsertedCount++;
        } catch (err) {
          this.logger.warn(`Failed to upsert rate for ${cur.code}:`, err);
        }
      }

      this.logger.log(
        `Stored ${upsertedCount} exchange rates from NBG for ${date}`,
      );
    } catch (err) {
      this.logger.error(`Failed to fetch exchange rates from NBG:`, err);
    }
  }

  /**
   * Get the exchange rate for a specific currency on a given date.
   * Falls back to the most recent available rate if the exact date is missing.
   */
  async getRate(
    currency: string,
    date?: string,
  ): Promise<{ rate: number; quantity: number; date: Date } | null> {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Try exact date first
    let record = await this.prisma.exchangeRate.findFirst({
      where: {
        currency: currency.toUpperCase(),
        base: 'GEL',
        date: targetDate,
      },
    });

    // Fall back to most recent available date
    if (!record) {
      record = await this.prisma.exchangeRate.findFirst({
        where: {
          currency: currency.toUpperCase(),
          base: 'GEL',
          date: { lte: targetDate },
        },
        orderBy: { date: 'desc' },
      });
    }

    if (!record) return null;

    return {
      rate: record.rate,
      quantity: record.quantity,
      date: record.date,
    };
  }

  /**
   * Get the latest rates for all currencies.
   */
  async getLatestRates(): Promise<
    Array<{ currency: string; rate: number; quantity: number; date: Date }>
  > {
    // Get distinct currencies
    const currencies = await this.prisma.exchangeRate.findMany({
      distinct: ['currency'],
      orderBy: { date: 'desc' },
      select: { currency: true },
    });

    const rates: Array<{
      currency: string;
      rate: number;
      quantity: number;
      date: Date;
    }> = [];

    for (const { currency } of currencies) {
      const latest = await this.prisma.exchangeRate.findFirst({
        where: { currency, base: 'GEL' },
        orderBy: { date: 'desc' },
      });
      if (latest) {
        rates.push({
          currency: latest.currency,
          rate: latest.rate,
          quantity: latest.quantity,
          date: latest.date,
        });
      }
    }

    return rates;
  }

  /**
   * Convert an amount from one currency to a base currency using exchange rates.
   * NBG rates are: 1 unit of foreign currency = X GEL (considering quantity).
   *
   * Example: if rate=2.65, quantity=1 for USD, then 1 USD = 2.65 GEL
   * Example: if rate=2.45, quantity=100 for JPY, then 100 JPY = 2.45 GEL
   *
   * To convert FROM a foreign currency TO GEL:
   *   amountInGEL = amount * (rate / quantity)
   *
   * To convert FROM GEL TO a foreign currency:
   *   amountInForeign = amount / (rate / quantity)
   *
   * To convert FROM currencyA TO currencyB (both non-GEL):
   *   First convert to GEL, then from GEL to target.
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: string,
  ): Promise<{
    convertedAmount: number;
    exchangeRate: number;
  } | null> {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return { convertedAmount: amount, exchangeRate: 1 };
    }

    // Convert everything through GEL as intermediary
    let amountInGel: number;

    if (fromCurrency.toUpperCase() === 'GEL') {
      amountInGel = amount;
    } else {
      const fromRate = await this.getRate(fromCurrency, date);
      if (!fromRate) return null;
      amountInGel = amount * (fromRate.rate / fromRate.quantity);
    }

    if (toCurrency.toUpperCase() === 'GEL') {
      const fromRate = await this.getRate(fromCurrency, date);
      const effectiveRate = fromRate
        ? fromRate.rate / fromRate.quantity
        : 1;
      return {
        convertedAmount: Math.round(amountInGel * 100) / 100,
        exchangeRate: Math.round(effectiveRate * 10000) / 10000,
      };
    }

    const toRate = await this.getRate(toCurrency, date);
    if (!toRate) return null;

    const convertedAmount = amountInGel / (toRate.rate / toRate.quantity);
    // Calculate the effective direct exchange rate
    const fromRate = await this.getRate(fromCurrency, date);
    const fromRatePerUnit = fromCurrency.toUpperCase() === 'GEL'
      ? 1
      : (fromRate ? fromRate.rate / fromRate.quantity : 1);
    const toRatePerUnit = toRate.rate / toRate.quantity;
    const effectiveRate = fromRatePerUnit / toRatePerUnit;

    return {
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      exchangeRate: Math.round(effectiveRate * 10000) / 10000,
    };
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
