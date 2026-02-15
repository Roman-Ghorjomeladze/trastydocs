import type {
  ApiResponse,
  Membership,
  AddMemberDto,
  UpdateMemberDto,
} from '../types/index.ts';
import apiClient from './client.ts';

export async function getMembers(companyId: string): Promise<Membership[]> {
  const response = await apiClient.get<ApiResponse<Membership[]>>(
    `/companies/${companyId}/members`,
  );
  return response.data.data;
}

export async function addMember(
  companyId: string,
  data: AddMemberDto,
): Promise<Membership> {
  const response = await apiClient.post<ApiResponse<Membership>>(
    `/companies/${companyId}/members`,
    data,
  );
  return response.data.data;
}

export async function updateMember(
  companyId: string,
  memberId: string,
  data: UpdateMemberDto,
): Promise<Membership> {
  const response = await apiClient.patch<ApiResponse<Membership>>(
    `/companies/${companyId}/members/${memberId}`,
    data,
  );
  return response.data.data;
}

export async function removeMember(
  companyId: string,
  memberId: string,
): Promise<void> {
  await apiClient.delete(`/companies/${companyId}/members/${memberId}`);
}
