import type {
  ApiResponse,
  AdminStats,
  AdminUserDetail,
  User,
  SubscriptionPlan,
  CreditTransaction,
  Company,
  Document,
  PlanLimits,
} from '../types/index.ts';
import apiClient from './client.ts';

// ── Stats ──

export async function getStats(): Promise<AdminStats> {
  const response = await apiClient.get<ApiResponse<AdminStats>>('/admin/stats');
  return response.data.data;
}

// ── Users ──

export async function getUsers(params?: {
  search?: string;
  planId?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: AdminUserDetail[]; total: number }> {
  const response = await apiClient.get<
    ApiResponse<{ users: AdminUserDetail[]; total: number }>
  >('/admin/users', { params });
  return response.data.data;
}

export async function getUser(userId: string): Promise<AdminUserDetail> {
  const response = await apiClient.get<ApiResponse<AdminUserDetail>>(
    `/admin/users/${userId}`,
  );
  return response.data.data;
}

export async function updateUser(
  userId: string,
  data: { isActive?: boolean },
): Promise<User> {
  const response = await apiClient.patch<ApiResponse<User>>(
    `/admin/users/${userId}`,
    data,
  );
  return response.data.data;
}

export async function toggleAdmin(
  userId: string,
  isAdmin: boolean,
): Promise<{ isAdmin: boolean }> {
  const response = await apiClient.patch<ApiResponse<{ isAdmin: boolean }>>(
    `/admin/users/${userId}`,
    { isAdmin },
  );
  return response.data.data;
}

// ── Subscriptions ──

export async function assignPlan(
  userId: string,
  planId: string,
): Promise<void> {
  await apiClient.put(`/admin/users/${userId}/subscription`, { planId });
}

// ── Credits ──

export async function grantCredits(
  userId: string,
  data: { amount: number; reason?: string },
): Promise<CreditTransaction> {
  const response = await apiClient.post<ApiResponse<CreditTransaction>>(
    `/admin/users/${userId}/credits`,
    data,
  );
  return response.data.data;
}

export async function getCreditHistory(
  userId: string,
): Promise<CreditTransaction[]> {
  const response = await apiClient.get<ApiResponse<CreditTransaction[]>>(
    `/admin/users/${userId}/credits`,
  );
  return response.data.data;
}

// ── Plans ──

export async function getAdminPlans(): Promise<SubscriptionPlan[]> {
  const response = await apiClient.get<ApiResponse<SubscriptionPlan[]>>(
    '/admin/plans',
  );
  return response.data.data;
}

export async function createPlan(data: {
  name: string;
  displayName: string;
  price: number;
  limits: PlanLimits;
  sortOrder?: number;
}): Promise<SubscriptionPlan> {
  const response = await apiClient.post<ApiResponse<SubscriptionPlan>>(
    '/admin/plans',
    data,
  );
  return response.data.data;
}

export async function updatePlan(
  planId: string,
  data: Partial<{
    displayName: string;
    price: number;
    limits: PlanLimits;
    isActive: boolean;
    sortOrder: number;
  }>,
): Promise<SubscriptionPlan> {
  const response = await apiClient.patch<ApiResponse<SubscriptionPlan>>(
    `/admin/plans/${planId}`,
    data,
  );
  return response.data.data;
}

export async function deletePlan(planId: string): Promise<void> {
  await apiClient.delete(`/admin/plans/${planId}`);
}

// ── Companies ──

export async function getCompanies(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ companies: Company[]; total: number }> {
  const response = await apiClient.get<
    ApiResponse<{ companies: Company[]; total: number }>
  >('/admin/companies', { params });
  return response.data.data;
}

// ── Documents ──

export async function getDocuments(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ documents: Document[]; total: number }> {
  const response = await apiClient.get<
    ApiResponse<{ documents: Document[]; total: number }>
  >('/admin/documents', { params });
  return response.data.data;
}
