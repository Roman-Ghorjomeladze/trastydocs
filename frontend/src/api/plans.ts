import type { ApiResponse, SubscriptionPlan } from '../types/index.ts';
import apiClient from './client.ts';

export async function getPlans(): Promise<SubscriptionPlan[]> {
  const response = await apiClient.get<ApiResponse<SubscriptionPlan[]>>('/plans');
  return response.data.data;
}
