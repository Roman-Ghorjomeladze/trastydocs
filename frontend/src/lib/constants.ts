// ── Route Paths ──

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SIGNATURES: '/signatures',
  COMPANIES: '/companies',
  COMPANY_DETAIL: (companyId: string) => `/companies/${companyId}`,
  MEMBERS: (companyId: string) => `/companies/${companyId}/members`,
  DOCUMENTS: (companyId: string) => `/companies/${companyId}/documents`,
  DOCUMENT_DETAIL: (companyId: string, documentId: string) =>
    `/companies/${companyId}/documents/${documentId}`,
  DOCUMENT_BUILDER: (companyId: string, documentId: string) =>
    `/companies/${companyId}/documents/${documentId}/builder`,
  CONTRACTORS: (companyId: string) => `/companies/${companyId}/contractors`,
  COMPANY_SIGNATURES: (companyId: string) => `/companies/${companyId}/signatures`,
  STAMPS: (companyId: string) => `/companies/${companyId}/stamps`,
  VEHICLES: (companyId: string) => `/companies/${companyId}/vehicles`,
  AUDIT_LOGS: (companyId: string) => `/companies/${companyId}/audit`,
} as const;

// ── Role Labels ──

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

// ── Role Colors (Tailwind classes) ──

export const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  MEMBER: 'bg-green-100 text-green-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

// ── Membership Status Labels ──

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INVITED: 'Invited',
  SUSPENDED: 'Suspended',
};

// ── Document Status Labels ──

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_SIGNATURE: 'Pending Signature',
  SIGNED: 'Signed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
};

// ── Document Status Colors (Tailwind classes) ──

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800',
  SIGNED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  ARCHIVED: 'bg-orange-100 text-orange-800',
};

// ── Audit Action Labels ──

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  VIEW: 'Viewed',
  EXPORT: 'Exported',
  DUPLICATE: 'Duplicated',
  SIGN: 'Signed',
  SEND: 'Sent',
  LOGIN: 'Logged in',
  LOGOUT: 'Logged out',
};

// ── Audit Action Colors (Tailwind classes) ──

export const AUDIT_ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  VIEW: 'bg-gray-100 text-gray-800',
  EXPORT: 'bg-purple-100 text-purple-800',
  DUPLICATE: 'bg-indigo-100 text-indigo-800',
  SIGN: 'bg-emerald-100 text-emerald-800',
  SEND: 'bg-cyan-100 text-cyan-800',
  LOGIN: 'bg-teal-100 text-teal-800',
  LOGOUT: 'bg-orange-100 text-orange-800',
};

// ── Pagination Defaults ──

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
