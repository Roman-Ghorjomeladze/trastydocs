import type { ApiResponse, Vehicle } from '../types/index.ts';
import apiClient from './client.ts';

export async function getVehicles(
  companyId: string,
  type?: 'TRUCK' | 'TRAILER',
): Promise<Vehicle[]> {
  const params = type ? { type } : undefined;
  const response = await apiClient.get<ApiResponse<Vehicle[]>>(
    `/companies/${companyId}/vehicles`,
    { params },
  );
  return response.data.data;
}

export async function createVehicle(
  companyId: string,
  data: {
    model: string;
    licensePlate: string;
    type: 'TRUCK' | 'TRAILER';
    notes?: string;
    defaultTrailerId?: string;
  },
): Promise<Vehicle> {
  const response = await apiClient.post<ApiResponse<Vehicle>>(
    `/companies/${companyId}/vehicles`,
    data,
  );
  return response.data.data;
}

export async function updateVehicle(
  companyId: string,
  id: string,
  data: {
    model?: string;
    licensePlate?: string;
    notes?: string;
    isActive?: boolean;
    defaultTrailerId?: string | null;
  },
): Promise<Vehicle> {
  const response = await apiClient.patch<ApiResponse<Vehicle>>(
    `/companies/${companyId}/vehicles/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteVehicle(
  companyId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(`/companies/${companyId}/vehicles/${id}`);
}
