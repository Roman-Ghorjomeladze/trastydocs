import { create } from 'zustand';
import type { User } from '../types/index.ts';
import * as authApi from '../api/auth.ts';
import { registerAuthCallbacks, registerUpgradeCallback } from '../api/client.ts';
import { useUiStore } from './ui.store.ts';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** true once the initial /me call has resolved (or skipped if no token) */
  isInitialized: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

// ── SessionStorage helpers (token only) ──

const SESSION_KEY_TOKEN = 'auth_token';

function persistToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(SESSION_KEY_TOKEN, token);
  } else {
    sessionStorage.removeItem(SESSION_KEY_TOKEN);
  }
}

function loadPersistedToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY_TOKEN);
}

// ── Hydrate token from sessionStorage ──

const persistedToken = loadPersistedToken();

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // ── State ──
  user: null,
  accessToken: persistedToken,
  isAuthenticated: false,
  isLoading: !!persistedToken, // start loading if we have a token to validate
  isInitialized: false,

  // ── Actions ──
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await authApi.login({ email, password });
      persistToken(result.accessToken);
      set({ accessToken: result.accessToken });

      // Fetch full profile (includes isAdmin, subscription, usage)
      const user = await authApi.getMe();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      // Attach referral code from localStorage if present
      const ref = localStorage.getItem('referral_code') || undefined;
      const result = await authApi.register({ ...data, ref });
      localStorage.removeItem('referral_code');
      persistToken(result.accessToken);
      set({ accessToken: result.accessToken });

      // Fetch full profile
      const user = await authApi.getMe();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      persistToken(null);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setToken: (token) => {
    persistToken(token);
    set({ accessToken: token });
  },

  clearAuth: () => {
    persistToken(null);
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
    } catch {
      persistToken(null);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  initialize: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      set({ isInitialized: true, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
    } catch {
      persistToken(null);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },
}));

// Register callbacks so the API client can read/write auth state
// without a circular import.
registerAuthCallbacks({
  getAccessToken: () => useAuthStore.getState().accessToken,
  onTokenRefreshed: (token) => useAuthStore.getState().setToken(token),
  onAuthCleared: () => useAuthStore.getState().clearAuth(),
});

// Register upgrade modal callback for PLAN_LIMIT_REACHED responses
registerUpgradeCallback((data) => {
  useUiStore.getState().showUpgradeModal(data);
});

// Auto-initialize: if we have a persisted token, validate it by calling /me
useAuthStore.getState().initialize();
