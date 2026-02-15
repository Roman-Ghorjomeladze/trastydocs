import { create } from 'zustand';
import type {
  Contact,
  CreateContactDto,
  UpdateContactDto,
} from '../types/index.ts';
import * as contactsApi from '../api/contacts.ts';

interface ContactState {
  contacts: Contact[];
  isLoading: boolean;
}

interface ContactActions {
  fetchContacts: (
    companyId: string,
    search?: string,
  ) => Promise<void>;
  createContact: (
    companyId: string,
    data: CreateContactDto,
  ) => Promise<Contact>;
  updateContact: (
    companyId: string,
    id: string,
    data: UpdateContactDto,
  ) => Promise<Contact>;
  deleteContact: (companyId: string, id: string) => Promise<void>;
  clearContacts: () => void;
}

export const useContactStore = create<ContactState & ContactActions>(
  (set) => ({
    // ── State ──
    contacts: [],
    isLoading: false,

    // ── Actions ──
    fetchContacts: async (companyId, search) => {
      set({ isLoading: true });
      try {
        const contacts = await contactsApi.getContacts(companyId, search);
        set({ contacts, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    createContact: async (companyId, data) => {
      const contact = await contactsApi.createContact(companyId, data);
      set((state) => ({ contacts: [...state.contacts, contact] }));
      return contact;
    },

    updateContact: async (companyId, id, data) => {
      const updated = await contactsApi.updateContact(companyId, id, data);
      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === id ? { ...c, ...updated } : c,
        ),
      }));
      return updated;
    },

    deleteContact: async (companyId, id) => {
      await contactsApi.deleteContact(companyId, id);
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
      }));
    },

    clearContacts: () => {
      set({ contacts: [], isLoading: false });
    },
  }),
);
