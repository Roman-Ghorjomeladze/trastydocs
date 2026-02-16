import type {
  ApiResponse,
  Contractor,
  CreateContractorDto,
  UpdateContractorDto,
} from '../types/index.ts';
import apiClient from './client.ts';

export async function getContractors(
  companyId: string,
  search?: string,
): Promise<Contractor[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);

  const query = params.toString();
  const url = `/companies/${companyId}/contractors${query ? `?${query}` : ''}`;

  const response = await apiClient.get<ApiResponse<Contractor[]>>(url);
  return response.data.data;
}

export async function getContractor(
  companyId: string,
  id: string,
): Promise<Contractor> {
  const response = await apiClient.get<ApiResponse<Contractor>>(
    `/companies/${companyId}/contractors/${id}`,
  );
  return response.data.data;
}

export async function createContractor(
  companyId: string,
  data: CreateContractorDto,
): Promise<Contractor> {
  const response = await apiClient.post<ApiResponse<Contractor>>(
    `/companies/${companyId}/contractors`,
    data,
  );
  return response.data.data;
}

export async function updateContractor(
  companyId: string,
  id: string,
  data: UpdateContractorDto,
): Promise<Contractor> {
  const response = await apiClient.patch<ApiResponse<Contractor>>(
    `/companies/${companyId}/contractors/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteContractor(
  companyId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(`/companies/${companyId}/contractors/${id}`);
}
