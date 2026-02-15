import type {
  ApiResponse,
  Company,
  CreateCompanyDto,
  UpdateCompanyDto,
} from '../types/index.ts';
import apiClient from './client.ts';

export async function getCompanies(): Promise<Company[]> {
  const response = await apiClient.get<ApiResponse<Company[]>>('/companies');
  return response.data.data;
}

export async function getCompany(id: string): Promise<Company> {
  const response = await apiClient.get<ApiResponse<Company>>(`/companies/${id}`);
  return response.data.data;
}

export async function createCompany(data: CreateCompanyDto): Promise<Company> {
  const response = await apiClient.post<ApiResponse<Company>>('/companies', data);
  return response.data.data;
}

export async function updateCompany(
  id: string,
  data: UpdateCompanyDto,
): Promise<Company> {
  const response = await apiClient.patch<ApiResponse<Company>>(
    `/companies/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteCompany(id: string): Promise<void> {
  await apiClient.delete(`/companies/${id}`);
}
