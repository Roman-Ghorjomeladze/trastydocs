import type { ApiResponse, StampAsset } from '../types/index.ts';
import apiClient from './client.ts';

export async function getStamps(companyId: string): Promise<StampAsset[]> {
  const response = await apiClient.get<ApiResponse<StampAsset[]>>(
    `/companies/${companyId}/stamps`,
  );
  return response.data.data;
}

export async function createStamp(
  companyId: string,
  data: { name?: string; imageBase64: string; isDefault?: boolean },
): Promise<StampAsset> {
  const response = await apiClient.post<ApiResponse<StampAsset>>(
    `/companies/${companyId}/stamps`,
    data,
  );
  return response.data.data;
}

export async function updateStamp(
  companyId: string,
  id: string,
  data: { name?: string; isDefault?: boolean },
): Promise<StampAsset> {
  const response = await apiClient.patch<ApiResponse<StampAsset>>(
    `/companies/${companyId}/stamps/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteStamp(
  companyId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(`/companies/${companyId}/stamps/${id}`);
}
