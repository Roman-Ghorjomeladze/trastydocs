import type {
  ApiResponse,
  ExchangeRateEntry,
  CurrencyConversion,
} from '../types/index.ts';
import apiClient from './client.ts';

export async function getLatestRates(): Promise<ExchangeRateEntry[]> {
  const response = await apiClient.get<ApiResponse<ExchangeRateEntry[]>>(
    '/exchange-rates/latest',
  );
  return response.data.data;
}

export async function getRate(
  currency: string,
  date?: string,
): Promise<ExchangeRateEntry | null> {
  const params = new URLSearchParams({ currency });
  if (date) params.set('date', date);
  const response = await apiClient.get<ApiResponse<ExchangeRateEntry | null>>(
    `/exchange-rates?${params.toString()}`,
  );
  return response.data.data;
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
  date?: string,
): Promise<CurrencyConversion | null> {
  const params = new URLSearchParams({
    amount: String(amount),
    from,
    to,
  });
  if (date) params.set('date', date);
  const response = await apiClient.get<ApiResponse<CurrencyConversion | null>>(
    `/exchange-rates/convert?${params.toString()}`,
  );
  return response.data.data;
}
