import type { ApiResponse, LoginDto, LoginResponse, RegisterDto, User } from '../types/index.ts';
import apiClient from './client.ts';

export async function login(data: LoginDto): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
  return response.data.data;
}

export async function register(data: RegisterDto): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/register', data);
  return response.data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function refreshToken(): Promise<{ accessToken: string }> {
  const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
  return response.data.data;
}

export async function googleLogin(): Promise<void> {
  window.location.href = `${apiClient.defaults.baseURL}/auth/google`;
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me');
  return response.data.data;
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiClient.patch<ApiResponse<void>>('/auth/change-password', data);
}

export async function updateProfile(
  userId: string,
  data: { name?: string },
): Promise<User> {
  const response = await apiClient.patch<ApiResponse<User>>(
    `/users/${userId}`,
    data,
  );
  return response.data.data;
}
