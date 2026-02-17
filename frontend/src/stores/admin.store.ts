import { create } from 'zustand';
import type {
  AdminStats,
  AdminUserDetail,
  SubscriptionPlan,
  CreditTransaction,
  Company,
  Document,
} from '../types/index.ts';
import * as adminApi from '../api/admin.ts';

interface AdminState {
  // Stats
  stats: AdminStats | null;
  statsLoading: boolean;

  // Users
  users: AdminUserDetail[];
  usersTotal: number;
  usersLoading: boolean;
  selectedUser: AdminUserDetail | null;
  selectedUserLoading: boolean;

  // Plans
  plans: SubscriptionPlan[];
  plansLoading: boolean;

  // Credits
  creditHistory: CreditTransaction[];
  creditHistoryLoading: boolean;

  // Companies
  companies: Company[];
  companiesTotal: number;
  companiesLoading: boolean;

  // Documents
  documents: Document[];
  documentsTotal: number;
  documentsLoading: boolean;
}

interface AdminActions {
  fetchStats: () => Promise<void>;
  fetchUsers: (params?: { search?: string; planId?: string; page?: number; limit?: number }) => Promise<void>;
  fetchUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, data: { isActive?: boolean }) => Promise<void>;
  toggleAdmin: (userId: string, isAdmin: boolean) => Promise<void>;
  assignPlan: (userId: string, planId: string) => Promise<void>;
  grantCredits: (userId: string, amount: number, reason?: string) => Promise<void>;
  fetchCreditHistory: (userId: string) => Promise<void>;
  fetchPlans: () => Promise<void>;
  createPlan: (data: Parameters<typeof adminApi.createPlan>[0]) => Promise<void>;
  updatePlan: (planId: string, data: Parameters<typeof adminApi.updatePlan>[1]) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  fetchCompanies: (params?: { search?: string; page?: number; limit?: number }) => Promise<void>;
  fetchDocuments: (params?: { search?: string; page?: number; limit?: number }) => Promise<void>;
  clearSelectedUser: () => void;
}

export const useAdminStore = create<AdminState & AdminActions>((set) => ({
  // Initial state
  stats: null,
  statsLoading: false,
  users: [],
  usersTotal: 0,
  usersLoading: false,
  selectedUser: null,
  selectedUserLoading: false,
  plans: [],
  plansLoading: false,
  creditHistory: [],
  creditHistoryLoading: false,
  companies: [],
  companiesTotal: 0,
  companiesLoading: false,
  documents: [],
  documentsTotal: 0,
  documentsLoading: false,

  // Actions
  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const stats = await adminApi.getStats();
      set({ stats, statsLoading: false });
    } catch {
      set({ statsLoading: false });
    }
  },

  fetchUsers: async (params) => {
    set({ usersLoading: true });
    try {
      const result = await adminApi.getUsers(params);
      set({ users: result.users, usersTotal: result.total, usersLoading: false });
    } catch {
      set({ usersLoading: false });
    }
  },

  fetchUser: async (userId) => {
    set({ selectedUserLoading: true });
    try {
      const user = await adminApi.getUser(userId);
      set({ selectedUser: user, selectedUserLoading: false });
    } catch {
      set({ selectedUserLoading: false });
    }
  },

  updateUser: async (userId, data) => {
    const updated = await adminApi.updateUser(userId, data);
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, ...updated } : u)),
      selectedUser: state.selectedUser?.id === userId ? { ...state.selectedUser, ...updated } : state.selectedUser,
    }));
  },

  toggleAdmin: async (userId, isAdmin) => {
    await adminApi.toggleAdmin(userId, isAdmin);
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, isAdmin } : u)),
      selectedUser: state.selectedUser?.id === userId ? { ...state.selectedUser, isAdmin } : state.selectedUser,
    }));
  },

  assignPlan: async (userId, planId) => {
    await adminApi.assignPlan(userId, planId);
    // Refetch user to get updated subscription
    const user = await adminApi.getUser(userId);
    set((state) => ({
      selectedUser: state.selectedUser?.id === userId ? user : state.selectedUser,
      users: state.users.map((u) => (u.id === userId ? user : u)),
    }));
  },

  grantCredits: async (userId, amount, reason) => {
    await adminApi.grantCredits(userId, { amount, reason });
    // Refetch user and credit history
    const [user, creditHistory] = await Promise.all([
      adminApi.getUser(userId),
      adminApi.getCreditHistory(userId),
    ]);
    set((state) => ({
      selectedUser: state.selectedUser?.id === userId ? user : state.selectedUser,
      creditHistory,
    }));
  },

  fetchCreditHistory: async (userId) => {
    set({ creditHistoryLoading: true });
    try {
      const creditHistory = await adminApi.getCreditHistory(userId);
      set({ creditHistory, creditHistoryLoading: false });
    } catch {
      set({ creditHistoryLoading: false });
    }
  },

  fetchPlans: async () => {
    set({ plansLoading: true });
    try {
      const plans = await adminApi.getAdminPlans();
      set({ plans, plansLoading: false });
    } catch {
      set({ plansLoading: false });
    }
  },

  createPlan: async (data) => {
    const plan = await adminApi.createPlan(data);
    set((state) => ({ plans: [...state.plans, plan] }));
  },

  updatePlan: async (planId, data) => {
    const updated = await adminApi.updatePlan(planId, data);
    set((state) => ({
      plans: state.plans.map((p) => (p.id === planId ? updated : p)),
    }));
  },

  deletePlan: async (planId) => {
    await adminApi.deletePlan(planId);
    set((state) => ({
      plans: state.plans.filter((p) => p.id !== planId),
    }));
  },

  fetchCompanies: async (params) => {
    set({ companiesLoading: true });
    try {
      const result = await adminApi.getCompanies(params);
      set({ companies: result.companies, companiesTotal: result.total, companiesLoading: false });
    } catch {
      set({ companiesLoading: false });
    }
  },

  fetchDocuments: async (params) => {
    set({ documentsLoading: true });
    try {
      const result = await adminApi.getDocuments(params);
      set({ documents: result.documents, documentsTotal: result.total, documentsLoading: false });
    } catch {
      set({ documentsLoading: false });
    }
  },

  clearSelectedUser: () => set({ selectedUser: null, creditHistory: [] }),
}));
