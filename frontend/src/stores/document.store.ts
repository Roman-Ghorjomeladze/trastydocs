import { create } from 'zustand';
import type { Document, DocumentStatus } from '../types/index.ts';
import * as documentsApi from '../api/documents.ts';
import type { DocumentFilters } from '../api/documents.ts';

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  isLoading: boolean;
}

interface DocumentActions {
  fetchDocuments: (companyId: string, filters?: DocumentFilters) => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  createDocument: (
    companyId: string,
    data: {
      name: string;
      documentNumber?: string;
      buyerId?: string;
      sellerId?: string;
      inputData?: Record<string, unknown>;
      notes?: string;
    },
  ) => Promise<Document>;
  updateDocument: (
    id: string,
    data: {
      name?: string;
      inputData?: Record<string, unknown>;
      notes?: string | null;
      status?: DocumentStatus;
      buyerId?: string | null;
      sellerId?: string | null;
    },
  ) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  duplicateDocument: (id: string) => Promise<Document>;
  sendDocument: (
    id: string,
    data: { recipientEmail: string; message?: string },
  ) => Promise<void>;
  uploadPdf: (id: string, pdfBase64: string) => Promise<Document>;
  clearDocuments: () => void;
}

export const useDocumentStore = create<DocumentState & DocumentActions>(
  (set) => ({
    documents: [],
    currentDocument: null,
    isLoading: false,

    fetchDocuments: async (companyId, filters) => {
      set({ isLoading: true });
      try {
        const documents = await documentsApi.getDocuments(companyId, filters);
        set({ documents, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    fetchDocument: async (id) => {
      set({ isLoading: true });
      try {
        const doc = await documentsApi.getDocument(id);
        set({ currentDocument: doc, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    createDocument: async (companyId, data) => {
      const doc = await documentsApi.createDocument(companyId, data);
      set((state) => ({ documents: [doc, ...state.documents] }));
      return doc;
    },

    updateDocument: async (id, data) => {
      const updated = await documentsApi.updateDocument(id, data);
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, ...updated } : d,
        ),
        currentDocument:
          state.currentDocument?.id === id
            ? { ...state.currentDocument, ...updated }
            : state.currentDocument,
      }));
      return updated;
    },

    deleteDocument: async (id) => {
      await documentsApi.deleteDocument(id);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
        currentDocument:
          state.currentDocument?.id === id ? null : state.currentDocument,
      }));
    },

    duplicateDocument: async (id) => {
      const doc = await documentsApi.duplicateDocument(id);
      set((state) => ({ documents: [doc, ...state.documents] }));
      return doc;
    },

    sendDocument: async (id, data) => {
      await documentsApi.sendDocument(id, data);
    },

    uploadPdf: async (id, pdfBase64) => {
      const updated = await documentsApi.uploadPdf(id, pdfBase64);
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, ...updated } : d,
        ),
        currentDocument:
          state.currentDocument?.id === id
            ? { ...state.currentDocument, ...updated }
            : state.currentDocument,
      }));
      return updated;
    },

    clearDocuments: () => {
      set({ documents: [], currentDocument: null, isLoading: false });
    },
  }),
);
