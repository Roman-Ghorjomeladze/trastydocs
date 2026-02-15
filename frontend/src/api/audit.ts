import type { ApiResponse, AuditLog, AuditAction } from '../types/index.ts';
import apiClient from './client.ts';

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

export async function getAuditLogs(
  companyId: string,
  params?: {
    action?: AuditAction;
    entity?: string;
    userId?: string;
    page?: number;
    limit?: number;
  },
): Promise<AuditLogsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.action) searchParams.set('action', params.action);
  if (params?.entity) searchParams.set('entity', params.entity);
  if (params?.userId) searchParams.set('userId', params.userId);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const url = `/companies/${companyId}/audit${query ? `?${query}` : ''}`;

  const response = await apiClient.get<ApiResponse<AuditLogsResponse>>(url);
  return response.data.data;
}
