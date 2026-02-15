import { create } from 'zustand';
import type { SignatureAsset } from '../types/index.ts';
import * as signaturesApi from '../api/signatures.ts';

interface SignatureState {
  signatures: SignatureAsset[];
  isLoading: boolean;
}

interface SignatureActions {
  fetchSignatures: () => Promise<void>;
  createSignature: (data: {
    name?: string;
    imageBase64: string;
    isDefault?: boolean;
  }) => Promise<SignatureAsset>;
  updateSignature: (
    id: string,
    data: { name?: string; isDefault?: boolean },
  ) => Promise<SignatureAsset>;
  deleteSignature: (id: string) => Promise<void>;
}

export const useSignatureStore = create<SignatureState & SignatureActions>(
  (set) => ({
    signatures: [],
    isLoading: false,

    fetchSignatures: async () => {
      set({ isLoading: true });
      try {
        const signatures = await signaturesApi.getSignatures();
        set({ signatures, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    createSignature: async (data) => {
      const signature = await signaturesApi.createSignature(data);
      set((state) => {
        let sigs = [...state.signatures, signature];
        if (signature.isDefault) {
          sigs = sigs.map((s) =>
            s.id !== signature.id ? { ...s, isDefault: false } : s,
          );
        }
        return { signatures: sigs };
      });
      return signature;
    },

    updateSignature: async (id, data) => {
      const updated = await signaturesApi.updateSignature(id, data);
      set((state) => {
        let sigs = state.signatures.map((s) =>
          s.id === id ? { ...s, ...updated } : s,
        );
        if (updated.isDefault) {
          sigs = sigs.map((s) =>
            s.id !== id ? { ...s, isDefault: false } : s,
          );
        }
        return { signatures: sigs };
      });
      return updated;
    },

    deleteSignature: async (id) => {
      await signaturesApi.deleteSignature(id);
      set((state) => ({
        signatures: state.signatures.filter((s) => s.id !== id),
      }));
    },
  }),
);
