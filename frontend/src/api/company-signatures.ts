import type { ApiResponse, CompanySignature } from '../types/index.ts';
import apiClient from './client.ts';

export async function getCompanySignatures(companyId: string): Promise<CompanySignature[]> {
  const response = await apiClient.get<ApiResponse<CompanySignature[]>>(
    `/companies/${companyId}/signatures`,
  );
  return response.data.data;
}

export async function createCompanySignature(
  companyId: string,
  data: { name?: string; imageBase64: string; isDefault?: boolean },
): Promise<CompanySignature> {
  const response = await apiClient.post<ApiResponse<CompanySignature>>(
    `/companies/${companyId}/signatures`,
    data,
  );
  return response.data.data;
}

export async function updateCompanySignature(
  companyId: string,
  id: string,
  data: { name?: string; isDefault?: boolean },
): Promise<CompanySignature> {
  const response = await apiClient.patch<ApiResponse<CompanySignature>>(
    `/companies/${companyId}/signatures/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteCompanySignature(
  companyId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(`/companies/${companyId}/signatures/${id}`);
}
