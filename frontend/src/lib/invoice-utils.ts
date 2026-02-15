import type { InvoiceData, InvoiceLineItem, Contact, Company } from '../types/index.ts';

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
 * Populate invoice data from a Contact (buyer or seller).
 * Only fills EMPTY fields — never overwrites user edits.
 */
export function populateFromContact(
  data: InvoiceData,
  contact: Contact,
  role: 'buyer' | 'seller',
): InvoiceData {
  const result = { ...data };

  if (role === 'buyer') {
    if (!result.buyerName) result.buyerName = contact.name || '';
    if (!result.buyerAddress) result.buyerAddress = contact.address || '';
    if (!result.buyerTaxId) result.buyerTaxId = contact.taxId || '';
    if (!result.buyerPhone) result.buyerPhone = contact.phone || '';
    if (!result.buyerEmail) result.buyerEmail = contact.email || '';
    if (!result.buyerBankAccounts) {
      result.buyerBankAccounts = serializeBankAccounts(contact.bankAccounts);
    }
  } else {
    if (!result.companyName) result.companyName = contact.name || '';
    if (!result.companyAddress) result.companyAddress = contact.address || '';
    if (!result.companyTaxId) result.companyTaxId = contact.taxId || '';
    if (!result.companyPhone) result.companyPhone = contact.phone || '';
    if (!result.companyEmail) result.companyEmail = contact.email || '';
    if (!result.companyBankAccounts) {
      result.companyBankAccounts = serializeBankAccounts(contact.bankAccounts);
    }
  }

  return result;
}

/**
 * Populate company/seller info from the Company entity.
 * Only fills EMPTY fields.
 */
export function populateFromCompany(
  data: InvoiceData,
  company: Company,
): InvoiceData {
  const result = { ...data };

  if (!result.companyName) result.companyName = company.name || '';
  if (!result.companyAddress) result.companyAddress = company.address || '';
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
