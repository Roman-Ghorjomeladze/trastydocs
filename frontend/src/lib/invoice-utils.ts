import type { InvoiceData, InvoiceLineItem, Contractor, Company } from '../types/index.ts';

/**
 * Create a new empty line item with a unique ID.
 */
export function createLineItem(): InvoiceLineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
  };
}

/**
 * Create an empty InvoiceData with sensible defaults.
 */
export function createEmptyInvoiceData(): InvoiceData {
  return {
    documentType: 'invoice',
    template: 'classic',
    language: 'en',

    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    currency: 'USD',

    companyName: '',
    companyAddress: '',
    companyTaxId: '',
    companyBankAccounts: '',
    companyPhone: '',
    companyEmail: '',

    buyerName: '',
    buyerAddress: '',
    buyerTaxId: '',
    buyerBankAccounts: '',
    buyerPhone: '',
    buyerEmail: '',

    items: [createLineItem()],

    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,

    notes: '',
    paymentTerms: '',

    // Transport fields
    transportRoute: '',
    vehicleModel: '',
    vehiclePlate: '',
    trailerPlate: '',
    directorName: '',
    amountInWords: '',
    serviceDescription: '',

    // Signature & stamp
    signatureId: '',
    stampId: '',
    signerName: '',
    signatureImageUrl: '',
    stampImageUrl: '',
  };
}

/**
 * Create empty invoice data with transport defaults.
 */
export function createEmptyTransportInvoiceData(): InvoiceData {
  return {
    ...createEmptyInvoiceData(),
    documentType: 'transport_invoice',
    currency: 'GEL',
  };
}

/**
 * Recalculate subtotal, taxAmount, and total from line items and taxRate.
 */
export function calculateTotals(
  data: InvoiceData,
): Pick<InvoiceData, 'subtotal' | 'taxAmount' | 'total'> {
  const subtotal = data.items.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxAmount = subtotal * (data.taxRate / 100);
  const total = subtotal + taxAmount;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Serialize bank accounts array to a display string.
 */
function serializeBankAccounts(
  bankAccounts: unknown,
): string {
  if (!Array.isArray(bankAccounts)) return '';
  return bankAccounts
    .map((ba: { name?: string; accountNumber?: string }) =>
      [ba.name, ba.accountNumber].filter(Boolean).join(': '),
    )
    .join('\n');
}

/**
 * Resolve a translated value: pick the translation for the given language,
 * falling back to the entity's default value.
 */
function resolveTranslation(
  translations: Record<string, string> | undefined | null,
  lang: string,
  fallback: string,
): string {
  if (translations && translations[lang]) return translations[lang];
  return fallback;
}

/**
 * Populate invoice data from a Contractor (buyer or seller).
 * Only fills EMPTY fields — never overwrites user edits.
 * Uses nameTranslations / addressTranslations when available,
 * falling back to the default name / address.
 */
export function populateFromContractor(
  data: InvoiceData,
  contractor: Contractor,
  role: 'buyer' | 'seller',
  lang?: string,
): InvoiceData {
  const result = { ...data };
  const docLang = lang || result.language || 'en';

  const translatedName = resolveTranslation(
    contractor.nameTranslations as Record<string, string> | undefined,
    docLang,
    contractor.name || '',
  );
  const translatedAddress = resolveTranslation(
    contractor.addressTranslations as Record<string, string> | undefined,
    docLang,
    contractor.address || '',
  );

  if (role === 'buyer') {
    if (!result.buyerName) result.buyerName = translatedName;
    if (!result.buyerAddress) result.buyerAddress = translatedAddress;
    if (!result.buyerTaxId) result.buyerTaxId = contractor.taxId || '';
    if (!result.buyerPhone) result.buyerPhone = contractor.phone || '';
    if (!result.buyerEmail) result.buyerEmail = contractor.email || '';
    if (!result.buyerBankAccounts) {
      result.buyerBankAccounts = serializeBankAccounts(contractor.bankAccounts);
    }
  } else {
    if (!result.companyName) result.companyName = translatedName;
    if (!result.companyAddress) result.companyAddress = translatedAddress;
    if (!result.companyTaxId) result.companyTaxId = contractor.taxId || '';
    if (!result.companyPhone) result.companyPhone = contractor.phone || '';
    if (!result.companyEmail) result.companyEmail = contractor.email || '';
    if (!result.companyBankAccounts) {
      result.companyBankAccounts = serializeBankAccounts(contractor.bankAccounts);
    }
  }

  return result;
}

/**
 * Populate company/seller info from the Company entity.
 * Only fills EMPTY fields.
 * Uses nameTranslations / addressTranslations when available.
 */
export function populateFromCompany(
  data: InvoiceData,
  company: Company,
  lang?: string,
): InvoiceData {
  const result = { ...data };
  const docLang = lang || result.language || 'en';

  const translatedName = resolveTranslation(
    company.nameTranslations as Record<string, string> | undefined,
    docLang,
    company.name || '',
  );
  const translatedAddress = resolveTranslation(
    company.addressTranslations as Record<string, string> | undefined,
    docLang,
    company.address || '',
  );

  if (!result.companyName) result.companyName = translatedName;
  if (!result.companyAddress) result.companyAddress = translatedAddress;
  if (!result.companyTaxId) result.companyTaxId = company.taxId || '';
  if (!result.companyPhone) result.companyPhone = company.phone || '';
  if (!result.companyEmail) result.companyEmail = company.email || '';

  return result;
}

/**
 * Type guard: checks if the data is structured InvoiceData.
 */
export function isInvoiceData(data: unknown): data is InvoiceData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.invoiceNumber === 'string' &&
    Array.isArray(d.items) &&
    typeof d.currency === 'string'
  );
}

/**
 * Format a number as currency using Intl.NumberFormat.
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
