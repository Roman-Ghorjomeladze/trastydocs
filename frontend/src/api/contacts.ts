import type {
  ApiResponse,
  Contact,
  CreateContactDto,
  UpdateContactDto,
} from '../types/index.ts';
import apiClient from './client.ts';

export async function getContacts(
  companyId: string,
  type?: 'BUYER' | 'SELLER',
  search?: string,
): Promise<Contact[]> {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (search) params.set('search', search);

  const query = params.toString();
  const url = `/companies/${companyId}/contacts${query ? `?${query}` : ''}`;

  const response = await apiClient.get<ApiResponse<Contact[]>>(url);
  return response.data.data;
}

export async function getContact(
  companyId: string,
  id: string,
): Promise<Contact> {
  const response = await apiClient.get<ApiResponse<Contact>>(
    `/companies/${companyId}/contacts/${id}`,
  );
  return response.data.data;
}

export async function createContact(
  companyId: string,
  data: CreateContactDto,
): Promise<Contact> {
  const response = await apiClient.post<ApiResponse<Contact>>(
    `/companies/${companyId}/contacts`,
    data,
  );
  return response.data.data;
}

export async function updateContact(
  companyId: string,
  id: string,
  data: UpdateContactDto,
): Promise<Contact> {
  const response = await apiClient.patch<ApiResponse<Contact>>(
    `/companies/${companyId}/contacts/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteContact(
  companyId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(`/companies/${companyId}/contacts/${id}`);
}
