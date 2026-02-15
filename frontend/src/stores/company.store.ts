import { create } from 'zustand';
import type { Company, CreateCompanyDto, UpdateCompanyDto } from '../types/index.ts';
import * as companiesApi from '../api/companies.ts';

const ACTIVE_COMPANY_KEY = 'activeCompanyId';

interface CompanyState {
  companies: Company[];
  activeCompany: Company | null;
  isLoading: boolean;
}

interface CompanyActions {
  fetchCompanies: () => Promise<void>;
  setActiveCompany: (company: Company | null) => void;
  createCompany: (data: CreateCompanyDto) => Promise<Company>;
  updateCompany: (id: string, data: UpdateCompanyDto) => Promise<Company>;
  deleteCompany: (id: string) => Promise<void>;
  hydrateActiveCompany: () => void;
}

export const useCompanyStore = create<CompanyState & CompanyActions>((set, get) => ({
  // ── State ──
  companies: [],
  activeCompany: null,
  isLoading: false,

  // ── Actions ──
  fetchCompanies: async () => {
    set({ isLoading: true });
    try {
      const companies = await companiesApi.getCompanies();
      set({ companies, isLoading: false });

      // After fetching, hydrate the active company from session
      const state = get();
      if (!state.activeCompany) {
        state.hydrateActiveCompany();
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveCompany: (company) => {
    set({ activeCompany: company });
    if (company) {
      sessionStorage.setItem(ACTIVE_COMPANY_KEY, company.id);
    } else {
      sessionStorage.removeItem(ACTIVE_COMPANY_KEY);
    }
  },

  createCompany: async (data) => {
    const company = await companiesApi.createCompany(data);
    set((state) => ({ companies: [...state.companies, company] }));
    return company;
  },

  updateCompany: async (id, data) => {
    const updated = await companiesApi.updateCompany(id, data);
    set((state) => ({
      companies: state.companies.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      activeCompany:
        state.activeCompany?.id === id
          ? { ...state.activeCompany, ...updated }
          : state.activeCompany,
    }));
    return updated;
  },

  deleteCompany: async (id) => {
    await companiesApi.deleteCompany(id);
    const wasActive = get().activeCompany?.id === id;
    set((state) => ({
      companies: state.companies.filter((c) => c.id !== id),
      activeCompany: state.activeCompany?.id === id ? null : state.activeCompany,
    }));
    if (wasActive) {
      sessionStorage.removeItem(ACTIVE_COMPANY_KEY);
      // Auto-select another company if available
      get().hydrateActiveCompany();
    }
  },

  hydrateActiveCompany: () => {
    const state = get();
    const savedId = sessionStorage.getItem(ACTIVE_COMPANY_KEY);
    if (savedId) {
      const found = state.companies.find((c) => c.id === savedId);
      if (found) {
        set({ activeCompany: found });
        return;
      }
    }
    // No saved company or it was deleted — auto-select the first one
    if (state.companies.length > 0) {
      const first = state.companies[0];
      set({ activeCompany: first });
      sessionStorage.setItem(ACTIVE_COMPANY_KEY, first.id);
    }
  },
}));
