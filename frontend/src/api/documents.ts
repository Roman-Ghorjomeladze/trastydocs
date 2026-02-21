import type {
  ApiResponse,
  AnalyticsData,
  AnalyticsFilters,
  DashboardStats,
  Document,
  DocumentSignature,
  DocumentStatus,
} from '../types/index.ts';
import apiClient from './client.ts';

export interface DocumentFilters {
  status?: DocumentStatus;
  statuses?: DocumentStatus[];
  search?: string;
  buyerIds?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export async function getDocuments(
  companyId: string,
  filters?: DocumentFilters,
): Promise<Document[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.statuses?.length) params.set('statuses', filters.statuses.join(','));
  if (filters?.search) params.set('search', filters.search);
  if (filters?.buyerIds?.length) params.set('buyerIds', filters.buyerIds.join(','));
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  const query = params.toString();
  const url = `/companies/${companyId}/documents${query ? `?${query}` : ''}`;
  const response = await apiClient.get<ApiResponse<Document[]>>(url);
  return response.data.data;
}

export async function getDocument(id: string): Promise<Document> {
  const response = await apiClient.get<ApiResponse<Document>>(
    `/documents/${id}`,
  );
  return response.data.data;
}

export async function getNextDocumentNumber(
  companyId: string,
): Promise<string> {
  const response = await apiClient.get<
    ApiResponse<{ documentNumber: string }>
  >(`/companies/${companyId}/documents/next-number`);
  return response.data.data.documentNumber;
}

export async function checkDocumentNumber(
  companyId: string,
  number: string,
): Promise<boolean> {
  const response = await apiClient.get<ApiResponse<{ available: boolean }>>(
    `/companies/${companyId}/documents/check-number?number=${encodeURIComponent(number)}`,
  );
  return response.data.data.available;
}

export async function createDocument(
  companyId: string,
  data: {
    name: string;
    documentNumber?: string;
    buyerId?: string;
    sellerId?: string;
    inputData?: Record<string, unknown>;
    notes?: string;
  },
): Promise<Document> {
  const response = await apiClient.post<ApiResponse<Document>>(
    `/companies/${companyId}/documents`,
    data,
  );
  return response.data.data;
}

export async function updateDocument(
  id: string,
  data: {
    name?: string;
    inputData?: Record<string, unknown>;
    notes?: string | null;
    status?: DocumentStatus;
    buyerId?: string | null;
    sellerId?: string | null;
  },
): Promise<Document> {
  const response = await apiClient.patch<ApiResponse<Document>>(
    `/documents/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}

export async function sendDocument(
  id: string,
  data: { recipientEmail: string; message?: string },
): Promise<void> {
  await apiClient.post(`/documents/${id}/send`, data);
}

export async function duplicateDocument(id: string): Promise<Document> {
  const response = await apiClient.post<ApiResponse<Document>>(
    `/documents/${id}/duplicate`,
  );
  return response.data.data;
}

export async function uploadPdf(
  id: string,
  pdfBase64: string,
): Promise<Document> {
  const response = await apiClient.patch<ApiResponse<Document>>(
    `/documents/${id}/upload-pdf`,
    { pdfBase64 },
  );
  return response.data.data;
}

export async function applySignature(
  documentId: string,
  data: {
    signatureId?: string;
    stampId?: string;
    pageNumber?: number;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
  },
): Promise<DocumentSignature> {
  const response = await apiClient.post<ApiResponse<DocumentSignature>>(
    `/documents/${documentId}/signatures`,
    data,
  );
  return response.data.data;
}

export async function listSignatures(
  documentId: string,
): Promise<DocumentSignature[]> {
  const response = await apiClient.get<ApiResponse<DocumentSignature[]>>(
    `/documents/${documentId}/signatures`,
  );
  return response.data.data;
}

export async function removeSignature(
  documentId: string,
  signatureId: string,
): Promise<void> {
  await apiClient.delete(
    `/documents/${documentId}/signatures/${signatureId}`,
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<ApiResponse<DashboardStats>>(
    '/documents/dashboard/stats',
  );
  return response.data.data;
}

// ── Status Transitions ──

export async function markDocumentSent(id: string): Promise<Document> {
  const response = await apiClient.patch<ApiResponse<Document>>(
    `/documents/${id}/status/send`,
  );
  return response.data.data;
}

export async function markDocumentViewed(id: string): Promise<Document> {
  const response = await apiClient.patch<ApiResponse<Document>>(
    `/documents/${id}/status/view`,
  );
  return response.data.data;
}

export async function markDocumentPaid(id: string): Promise<Document> {
  const response = await apiClient.patch<ApiResponse<Document>>(
    `/documents/${id}/status/pay`,
  );
  return response.data.data;
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
): Promise<Document> {
  const response = await apiClient.patch<ApiResponse<Document>>(
    `/documents/${id}/status`,
    { status },
  );
  return response.data.data;
}

// ── Analytics ──

export async function getAnalytics(
  filters?: AnalyticsFilters,
): Promise<AnalyticsData> {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.companyIds?.length) params.set('companyIds', filters.companyIds.join(','));
  if (filters?.statuses?.length) params.set('statuses', filters.statuses.join(','));
  if (filters?.currencies?.length) params.set('currencies', filters.currencies.join(','));
  if (filters?.vehiclePlates?.length) params.set('vehiclePlates', filters.vehiclePlates.join(','));
  if (filters?.trailerPlates?.length) params.set('trailerPlates', filters.trailerPlates.join(','));
  if (filters?.buyerIds?.length) params.set('buyerIds', filters.buyerIds.join(','));
  const query = params.toString();
  const response = await apiClient.get<ApiResponse<AnalyticsData>>(
    `/documents/analytics${query ? `?${query}` : ''}`,
  );
  return response.data.data;
}
