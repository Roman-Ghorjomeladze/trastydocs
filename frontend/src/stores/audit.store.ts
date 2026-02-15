import { create } from 'zustand';
import type { AuditLog, AuditAction } from '../types/index.ts';
import * as auditApi from '../api/audit.ts';

interface AuditState {
  logs: AuditLog[];
  total: number;
  isLoading: boolean;
}

interface AuditActions {
  fetchLogs: (
    companyId: string,
    filters?: {
      action?: AuditAction;
      entity?: string;
      page?: number;
      limit?: number;
    },
  ) => Promise<void>;
  clearLogs: () => void;
}

export const useAuditStore = create<AuditState & AuditActions>((set) => ({
  logs: [],
  total: 0,
  isLoading: false,

  fetchLogs: async (companyId, filters) => {
    set({ isLoading: true });
    try {
      const result = await auditApi.getAuditLogs(companyId, filters);
      set({ logs: result.logs, total: result.total, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  clearLogs: () => {
    set({ logs: [], total: 0, isLoading: false });
  },
}));
