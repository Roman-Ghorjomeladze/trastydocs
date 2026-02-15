import axios, { type InternalAxiosRequestConfig } from 'axios';

// Extend AxiosRequestConfig to support the _retry flag
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// ── Callback registration to break circular dependency ──
// The auth store will register itself after creation.

let getAccessToken: (() => string | null) | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;
let onAuthCleared: (() => void) | null = null;

export function registerAuthCallbacks(callbacks: {
  getAccessToken: () => string | null;
  onTokenRefreshed: (token: string) => void;
  onAuthCleared: () => void;
}) {
  getAccessToken = callbacks.getAccessToken;
  onTokenRefreshed = callbacks.onTokenRefreshed;
  onAuthCleared = callbacks.onAuthCleared;
}

// ── Axios Instance ──

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: attach Bearer token ──

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor: handle 401 + token refresh ──

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const baseURL = apiClient.defaults.baseURL ?? '/api';
      const { data } = await axios.post<{ success: boolean; data: { accessToken: string } }>(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken = data.data.accessToken;
      onTokenRefreshed?.(newToken);
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      onAuthCleared?.();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
