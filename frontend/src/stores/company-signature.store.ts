import { create } from 'zustand';
import type { CompanySignature } from '../types/index.ts';
import * as api from '../api/company-signatures.ts';

interface CompanySignatureState {
  companySignatures: CompanySignature[];
  isLoading: boolean;
}

interface CompanySignatureActions {
  fetchCompanySignatures: (companyId: string) => Promise<void>;
  createCompanySignature: (
    companyId: string,
    data: { name?: string; imageBase64: string; isDefault?: boolean },
  ) => Promise<CompanySignature>;
  updateCompanySignature: (
    companyId: string,
    id: string,
    data: { name?: string; isDefault?: boolean },
  ) => Promise<CompanySignature>;
  deleteCompanySignature: (companyId: string, id: string) => Promise<void>;
}

export const useCompanySignatureStore = create<CompanySignatureState & CompanySignatureActions>((set) => ({
  companySignatures: [],
  isLoading: false,

  fetchCompanySignatures: async (companyId) => {
    set({ isLoading: true });
    try {
      const companySignatures = await api.getCompanySignatures(companyId);
      set({ companySignatures, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createCompanySignature: async (companyId, data) => {
    const sig = await api.createCompanySignature(companyId, data);
    set((state) => {
      let companySignatures = [...state.companySignatures, sig];
      if (sig.isDefault) {
        companySignatures = companySignatures.map((s) =>
          s.id !== sig.id ? { ...s, isDefault: false } : s,
        );
      }
      return { companySignatures };
    });
    return sig;
  },

  updateCompanySignature: async (companyId, id, data) => {
    const updated = await api.updateCompanySignature(companyId, id, data);
    set((state) => {
      let companySignatures = state.companySignatures.map((s) =>
        s.id === id ? { ...s, ...updated } : s,
      );
      if (updated.isDefault) {
        companySignatures = companySignatures.map((s) =>
          s.id !== id ? { ...s, isDefault: false } : s,
        );
      }
      return { companySignatures };
    });
    return updated;
  },

  deleteCompanySignature: async (companyId, id) => {
    await api.deleteCompanySignature(companyId, id);
    set((state) => ({
      companySignatures: state.companySignatures.filter((s) => s.id !== id),
    }));
  },
}));
