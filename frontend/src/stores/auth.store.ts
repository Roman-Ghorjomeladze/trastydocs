import { create } from 'zustand';
import type { User } from '../types/index.ts';
import * as authApi from '../api/auth.ts';
import { registerAuthCallbacks } from '../api/client.ts';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  fetchUser: () => Promise<void>;
}

// ── SessionStorage helpers ──

const SESSION_KEY_TOKEN = 'auth_token';
const SESSION_KEY_USER = 'auth_user';

function persistAuth(token: string | null, user: User | null) {
  if (token) {
    sessionStorage.setItem(SESSION_KEY_TOKEN, token);
  } else {
    sessionStorage.removeItem(SESSION_KEY_TOKEN);
  }
  if (user) {
    sessionStorage.setItem(SESSION_KEY_USER, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(SESSION_KEY_USER);
  }
}

function clearPersistedAuth() {
  sessionStorage.removeItem(SESSION_KEY_TOKEN);
  sessionStorage.removeItem(SESSION_KEY_USER);
}

function loadPersistedAuth(): { accessToken: string | null; user: User | null } {
  const accessToken = sessionStorage.getItem(SESSION_KEY_TOKEN);
  const userJson = sessionStorage.getItem(SESSION_KEY_USER);
  let user: User | null = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {
      // ignore corrupt data
    }
  }
  return { accessToken, user };
}

// ── Hydrate from sessionStorage ──

const persisted = loadPersistedAuth();

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // ── State (hydrated from session) ──
  user: persisted.user,
  accessToken: persisted.accessToken,
  isAuthenticated: !!persisted.accessToken && !!persisted.user,
  isLoading: false,

  // ── Actions ──
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await authApi.login({ email, password });
      persistAuth(result.accessToken, result.user);
      set({
        user: result.user,
        accessToken: result.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const result = await authApi.register(data);
      persistAuth(result.accessToken, result.user);
      set({
        user: result.user,
        accessToken: result.accessToken,
        isAuthenticated: true,
        isLoading: false,
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
      clearPersistedAuth();
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
    }
  },

  setUser: (user) => {
    const token = useAuthStore.getState().accessToken;
    persistAuth(token, user);
    set({ user, isAuthenticated: !!user });
  },

  setToken: (token) => {
    const user = useAuthStore.getState().user;
    persistAuth(token, user);
    set({ accessToken: token });
  },

  clearAuth: () => {
    clearPersistedAuth();
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
      const token = useAuthStore.getState().accessToken;
      persistAuth(token, user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearPersistedAuth();
      set({ user: null, isAuthenticated: false, isLoading: false });
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
