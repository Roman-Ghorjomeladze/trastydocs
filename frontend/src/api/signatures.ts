import type { ApiResponse, SignatureAsset } from '../types/index.ts';
import apiClient from './client.ts';

export async function getSignatures(): Promise<SignatureAsset[]> {
  const response =
    await apiClient.get<ApiResponse<SignatureAsset[]>>('/signatures');
  return response.data.data;
}

export async function createSignature(data: {
  name?: string;
  imageBase64: string;
  isDefault?: boolean;
}): Promise<SignatureAsset> {
  const response = await apiClient.post<ApiResponse<SignatureAsset>>(
    '/signatures',
    data,
  );
  return response.data.data;
}

export async function updateSignature(
  id: string,
  data: { name?: string; isDefault?: boolean },
): Promise<SignatureAsset> {
  const response = await apiClient.patch<ApiResponse<SignatureAsset>>(
    `/signatures/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteSignature(id: string): Promise<void> {
  await apiClient.delete(`/signatures/${id}`);
}
