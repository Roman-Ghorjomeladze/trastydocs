import { create } from 'zustand';
import type { StampAsset } from '../types/index.ts';
import * as stampsApi from '../api/stamps.ts';

interface StampState {
  stamps: StampAsset[];
  isLoading: boolean;
}

interface StampActions {
  fetchStamps: (companyId: string) => Promise<void>;
  createStamp: (
    companyId: string,
    data: { name?: string; imageBase64: string; isDefault?: boolean },
  ) => Promise<StampAsset>;
  updateStamp: (
    companyId: string,
    id: string,
    data: { name?: string; isDefault?: boolean },
  ) => Promise<StampAsset>;
  deleteStamp: (companyId: string, id: string) => Promise<void>;
}

export const useStampStore = create<StampState & StampActions>((set) => ({
  stamps: [],
  isLoading: false,

  fetchStamps: async (companyId) => {
    set({ isLoading: true });
    try {
      const stamps = await stampsApi.getStamps(companyId);
      set({ stamps, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createStamp: async (companyId, data) => {
    const stamp = await stampsApi.createStamp(companyId, data);
    set((state) => {
      let stamps = [...state.stamps, stamp];
      if (stamp.isDefault) {
        stamps = stamps.map((s) =>
          s.id !== stamp.id ? { ...s, isDefault: false } : s,
        );
      }
      return { stamps };
    });
    return stamp;
  },

  updateStamp: async (companyId, id, data) => {
    const updated = await stampsApi.updateStamp(companyId, id, data);
    set((state) => {
      let stamps = state.stamps.map((s) =>
        s.id === id ? { ...s, ...updated } : s,
      );
      if (updated.isDefault) {
        stamps = stamps.map((s) =>
          s.id !== id ? { ...s, isDefault: false } : s,
        );
      }
      return { stamps };
    });
    return updated;
  },

  deleteStamp: async (companyId, id) => {
    await stampsApi.deleteStamp(companyId, id);
    set((state) => ({
      stamps: state.stamps.filter((s) => s.id !== id),
    }));
  },
}));
