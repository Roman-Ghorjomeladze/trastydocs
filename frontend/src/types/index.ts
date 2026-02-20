// ── Enums & Union Types ──

export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export type DocumentStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'SIGNED'
  | 'SENT'
  | 'VIEWED'
  | 'COMPLETED'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'ARCHIVED';

export interface BankAccount {
  name: string;
  accountNumber: string;
}

export interface IntermediaryBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  swiftCode: string;
  beneficiaryName: string;
}

export interface CompanyBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  swiftCode: string;
  beneficiaryName: string;
  isDefault: boolean;
  intermediaryBanks: IntermediaryBankAccount[];
}

export type Translations = Record<string, string>;

export type VehicleType = 'TRUCK' | 'TRAILER';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'DUPLICATE'
  | 'SIGN'
  | 'SEND'
  | 'LOGIN'
  | 'LOGOUT';

// ── Subscription & Plan Types ──

export interface PlanLimits {
  maxCompanies: number;
  maxContractors: number;
  maxDocuments: number;
  maxSignaturesPerCompany: number;
  maxStampsPerCompany: number;
}

export interface UserSubscription {
  planName: string;
  planId: string;
  paddlePriceId?: string | null;
  limits: PlanLimits;
  status: string;
}

export interface UsageCounts {
  companies: number;
  contractors: number;
  documents: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  paddlePriceId?: string | null;
  limits: PlanLimits;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  grantedById: string;
  amount: number;
  reason?: string;
  createdAt: string;
}

export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

// ── Core Models ──

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  isAdmin?: boolean;
  subscription?: UserSubscription | null;
  usage?: UsageCounts;
  creditBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends User {
  _count?: {
    memberships: number;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalCompanies: number;
  totalDocuments: number;
  totalContractors: number;
  activeSubscriptions: Record<string, number>;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  bankAccounts?: CompanyBankAccount[];
  nameTranslations?: Translations;
  addressTranslations?: Translations;
  baseCurrency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    memberships: number;
  };
  membership?: {
    id: string;
    role: MembershipRole;
    status: MembershipStatus;
    joinedAt: string;
  };
}

export interface Membership {
  id: string;
  userId: string;
  companyId: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl'>;
  company?: Company;
}

export interface PendingInvitation {
  id: string;
  email: string;
  companyId: string;
  role: MembershipRole;
  expiresAt: string;
  createdAt: string;
  inviter?: Pick<User, 'id' | 'email' | 'name'>;
}

export interface AddMemberResult {
  type: 'added' | 'invited';
  membership?: Membership;
  invitation?: PendingInvitation;
}

export interface Document {
  id: string;
  name: string;
  documentNumber?: string;
  companyId: string;
  createdById: string;
  status: DocumentStatus;
  inputData: Record<string, unknown>;
  pdfUrl?: string;
  pdfSize?: number;
  buyerId?: string;
  sellerId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  duplicatedFromId?: string;

  // Currency conversion
  baseCurrency?: string;
  baseCurrencyAmount?: number;
  exchangeRate?: number;

  // Status tracking dates
  dueDate?: string;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;

  createdBy?: User;
  buyer?: Contractor;
  seller?: Contractor;
  documentSignatures?: DocumentSignature[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ── Invoice Structured Data ──

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type DocumentType = 'invoice' | 'transport_invoice';

export type TemplateStyle = 'classic' | 'modern' | 'minimal' | 'bold' | 'compact';

export interface InvoiceData {
  // Meta
  documentType: DocumentType;
  template: TemplateStyle;
  language: string;

  // Header
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;

  // Base currency conversion
  baseCurrency: string;
  baseCurrencyAmount: number;
  exchangeRate: number;

  // Company (seller) info
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  companyBankAccounts: string;
  selectedBankAccountIds: string[];
  companyPhone: string;
  companyEmail: string;

  // Buyer info
  buyerName: string;
  buyerAddress: string;
  buyerTaxId: string;
  buyerBankAccounts: string;
  buyerPhone: string;
  buyerEmail: string;

  // Line items
  items: InvoiceLineItem[];

  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;

  // Additional
  notes: string;
  paymentTerms: string;

  // Transport-specific fields
  transportRoute: string;
  vehicleModel: string;
  vehiclePlate: string;
  trailerPlate: string;
  directorName: string;
  amountInWords: string;
  serviceDescription: string;

  // Signature & stamp
  signatureId: string;
  stampId: string;
  signerName: string;
  signatureImageUrl: string;
  stampImageUrl: string;
}

export interface Contractor {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  bankAccounts?: BankAccount[];
  contactPerson?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  nameTranslations?: Translations;
  addressTranslations?: Translations;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureAsset {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StampAsset {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  imageUrl: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySignature {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  imageUrl: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  companyId: string;
  model: string;
  licensePlate: string;
  type: VehicleType;
  notes?: string;
  isActive: boolean;
  defaultTrailerId?: string | null;
  defaultTrailer?: Vehicle | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSignature {
  id: string;
  documentId: string;
  signatureId?: string;
  stampId?: string;
  pageNumber: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  appliedAt: string;
  signature?: SignatureAsset;
  stamp?: StampAsset;
}

export interface AuditLog {
  id: string;
  userId?: string;
  companyId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  user?: User;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<string, number>;
  recentDocuments: (Document & { company?: { id: string; name: string } })[];
}

// ── API Wrappers ──

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── DTOs ──

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface CreateCompanyDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

export interface UpdateCompanyDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  logoUrl?: string;
  bankAccounts?: CompanyBankAccount[];
  nameTranslations?: Translations;
  addressTranslations?: Translations;
  baseCurrency?: string;
}

export interface AddMemberDto {
  email: string;
  role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface UpdateMemberDto {
  role?: MembershipRole;
  status?: MembershipStatus;
}

export interface CreateContractorDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  bankAccounts?: BankAccount[];
  contactPerson?: string;
  notes?: string;
  nameTranslations?: Translations;
  addressTranslations?: Translations;
}

export interface UpdateContractorDto {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  bankAccounts?: BankAccount[] | null;
  contactPerson?: string | null;
  notes?: string | null;
  nameTranslations?: Translations | null;
  addressTranslations?: Translations | null;
}

export interface CreateDocumentDto {
  name: string;
  documentNumber?: string;
  buyerId?: string;
  sellerId?: string;
  inputData?: Record<string, unknown>;
  notes?: string;
}

export interface UpdateDocumentDto {
  name?: string;
  inputData?: Record<string, unknown>;
  notes?: string | null;
  status?: DocumentStatus;
  buyerId?: string | null;
  sellerId?: string | null;
}

// ── Exchange Rates ──

export interface ExchangeRateEntry {
  currency: string;
  rate: number;
  quantity: number;
  date: string;
}

export interface CurrencyConversion {
  convertedAmount: number;
  exchangeRate: number;
}

// ── Analytics ──

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  companyIds?: string[];
  statuses?: DocumentStatus[];
  currencies?: string[];
  vehiclePlates?: string[];
  trailerPlates?: string[];
}

export interface AnalyticsData {
  totalDocuments: number;
  totalAmount: number;
  totalBaseCurrencyAmount: number;
  baseCurrency: string;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  byStatus: Record<string, number>;
  byMonth: Array<{
    month: string;
    count: number;
    amount: number;
    baseCurrencyAmount: number;
  }>;
  byCompany: Array<{
    companyId: string;
    companyName: string;
    count: number;
    amount: number;
    baseCurrencyAmount: number;
  }>;
  byCurrency: Array<{
    currency: string;
    count: number;
    amount: number;
  }>;
  documents: AnalyticsDocument[];
}

export interface AnalyticsDocument {
  id: string;
  documentNumber?: string;
  createdAt: string;
  companyId: string;
  companyName: string;
  buyerName?: string;
  status: DocumentStatus;
  currency: string;
  amount: number;
  baseCurrency?: string;
  baseCurrencyAmount?: number;
  exchangeRate?: number;
}
