import { create } from 'zustand';
import type {
  Contractor,
  CreateContractorDto,
  UpdateContractorDto,
} from '../types/index.ts';
import * as contractorsApi from '../api/contractors.ts';

interface ContractorState {
  contractors: Contractor[];
  isLoading: boolean;
}

interface ContractorActions {
  fetchContractors: (
    companyId: string,
    search?: string,
  ) => Promise<void>;
  createContractor: (
    companyId: string,
    data: CreateContractorDto,
  ) => Promise<Contractor>;
  updateContractor: (
    companyId: string,
    id: string,
    data: UpdateContractorDto,
  ) => Promise<Contractor>;
  deleteContractor: (companyId: string, id: string) => Promise<void>;
  clearContractors: () => void;
}

export const useContractorStore = create<ContractorState & ContractorActions>(
  (set) => ({
    // ── State ──
    contractors: [],
    isLoading: false,

    // ── Actions ──
    fetchContractors: async (companyId, search) => {
      set({ isLoading: true });
      try {
        const contractors = await contractorsApi.getContractors(companyId, search);
        set({ contractors, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    createContractor: async (companyId, data) => {
      const contractor = await contractorsApi.createContractor(companyId, data);
      set((state) => ({ contractors: [...state.contractors, contractor] }));
      return contractor;
    },

    updateContractor: async (companyId, id, data) => {
      const updated = await contractorsApi.updateContractor(companyId, id, data);
      set((state) => ({
        contractors: state.contractors.map((c) =>
          c.id === id ? { ...c, ...updated } : c,
        ),
      }));
      return updated;
    },

    deleteContractor: async (companyId, id) => {
      await contractorsApi.deleteContractor(companyId, id);
      set((state) => ({
        contractors: state.contractors.filter((c) => c.id !== id),
      }));
    },

    clearContractors: () => {
      set({ contractors: [], isLoading: false });
    },
  }),
);
