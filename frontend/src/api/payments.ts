import type { ApiResponse } from '../types/index.ts';
import apiClient from './client.ts';

export interface CheckoutParams {
  paddlePriceId: string;
  customerEmail: string;
  customData: { user_id: string };
}

export async function getCheckoutParams(planId: string): Promise<CheckoutParams> {
  const response = await apiClient.post<ApiResponse<CheckoutParams>>('/payments/checkout', { planId });
  return response.data.data;
}

export async function cancelSubscription(): Promise<{ message: string }> {
  const response = await apiClient.post<ApiResponse<{ message: string }>>('/payments/cancel');
  return response.data.data;
}

export async function getSubscriptionStatus(): Promise<{
  planId: string;
  planName: string;
  status: string;
  hasActiveSubscription: boolean;
  renewsAt: string | null;
  expiresAt: string | null;
  customerPortalUrl: string | null;
} | null> {
  const response = await apiClient.get<ApiResponse<any>>('/payments/status');
  return response.data.data;
}
