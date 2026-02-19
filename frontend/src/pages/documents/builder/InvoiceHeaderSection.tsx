import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { InvoiceData, DocumentType } from '../../../types/index.ts';
import type { InvoiceLabels } from '../../../lib/invoice-i18n.ts';
import { INVOICE_LANGUAGES } from '../../../lib/invoice-i18n.ts';
import { TEMPLATE_OPTIONS } from '../../../lib/pdf-templates/index.ts';
import { convertCurrency } from '../../../api/exchange-rates.ts';

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS', 'GEL', 'JPY', 'CAD', 'AUD', 'CHF'];

const DOCUMENT_TYPES: { value: DocumentType; labelKey: 'invoice' | 'transportInvoice' }[] = [
  { value: 'invoice', labelKey: 'invoice' },
  { value: 'transport_invoice', labelKey: 'transportInvoice' },
];

interface Props {
  data: Pick<InvoiceData, 'invoiceNumber' | 'invoiceDate' | 'dueDate' | 'currency' | 'baseCurrency' | 'baseCurrencyAmount' | 'exchangeRate' | 'language' | 'documentType' | 'template'>;
  labels: InvoiceLabels;
  onChange: (field: string, value: string | number) => void;
  total?: number;
}

export function InvoiceHeaderSection({ data, labels, onChange, total }: Props) {
  const { t } = useTranslation();
  const [isConverting, setIsConverting] = useState(false);

  // Auto-convert when currency, baseCurrency, or total changes
  const doConvert = useCallback(async () => {
    if (!total || !data.currency || !data.baseCurrency) return;
    if (data.currency === data.baseCurrency) {
      onChange('baseCurrencyAmount', total);
      onChange('exchangeRate', 1);
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertCurrency(
        total,
        data.currency,
        data.baseCurrency,
        data.invoiceDate || undefined,
      );
      if (result) {
        onChange('baseCurrencyAmount', result.convertedAmount);
        onChange('exchangeRate', result.exchangeRate);
      }
    } catch {
      // silently fail — rates may not be available
    } finally {
      setIsConverting(false);
    }
  }, [total, data.currency, data.baseCurrency, data.invoiceDate]);

  useEffect(() => {
    doConvert();
  }, [doConvert]);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {data.documentType === 'transport_invoice' ? labels.transportInvoice : labels.invoice}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Document Type */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.documentType}</label>
          <select
            value={data.documentType}
            onChange={(e) => onChange('documentType', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-card"
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {labels[dt.labelKey]}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.language}</label>
          <select
            value={data.language}
            onChange={(e) => onChange('language', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-card"
          >
            {INVOICE_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Template */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.template}</label>
          <select
            value={data.template || 'classic'}
            onChange={(e) => onChange('template', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-card"
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {labels[t.labelKey]}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Number */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.invoiceNumber}</label>
          <input
            type="text"
            value={data.invoiceNumber}
            onChange={(e) => onChange('invoiceNumber', e.target.value)}
            placeholder="INV-2026-001"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.invoiceDate}</label>
          <input
            type="date"
            value={data.invoiceDate}
            onChange={(e) => onChange('invoiceDate', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.dueDate}</label>
          <input
            type="date"
            value={data.dueDate}
            onChange={(e) => onChange('dueDate', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.currency}</label>
          <select
            value={data.currency}
            onChange={(e) => onChange('currency', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-card"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Base Currency */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t('invoiceBuilder.baseCurrency')}
          </label>
          <select
            value={data.baseCurrency || 'GEL'}
            onChange={(e) => onChange('baseCurrency', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-card"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Exchange Rate Info */}
        {data.currency !== data.baseCurrency && total !== undefined && total > 0 && (
          <div className="col-span-2 bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t('invoiceBuilder.exchangeRate')}:
              </span>
              <span className="font-mono text-foreground">
                {isConverting ? (
                  <span className="text-muted-foreground">{t('common.loading')}...</span>
                ) : data.exchangeRate ? (
                  `1 ${data.currency} = ${data.exchangeRate} ${data.baseCurrency}`
                ) : (
                  <span className="text-muted-foreground">{t('invoiceBuilder.noRateAvailable')}</span>
                )}
              </span>
            </div>
            {data.baseCurrencyAmount !== undefined && data.baseCurrencyAmount > 0 && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">
                  {t('invoiceBuilder.convertedTotal')}:
                </span>
                <span className="font-semibold text-foreground">
                  {data.baseCurrencyAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {data.baseCurrency}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
