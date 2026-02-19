import type { InvoiceData } from '../../../types/index.ts';
import type { InvoiceLabels } from '../../../lib/invoice-i18n.ts';

interface Props {
  data: Pick<
    InvoiceData,
    'buyerName' | 'buyerAddress' | 'buyerTaxId' | 'buyerBankAccounts' | 'buyerPhone' | 'buyerEmail'
  >;
  labels: InvoiceLabels;
  onChange: (field: string, value: string) => void;
  onAutoFill?: () => void;
  onResync?: () => void;
}

export function BuyerInfoSection({ data, labels, onChange, onAutoFill, onResync }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {labels.buyerClient}
        </h3>
        <div className="flex items-center gap-2">
          {onResync && (
            <button
              type="button"
              onClick={onResync}
              className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {labels.resyncData}
            </button>
          )}
          {onAutoFill && (
            <button
              type="button"
              onClick={onAutoFill}
              className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {labels.autoFill}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.clientName}</label>
          <input
            type="text"
            value={data.buyerName}
            onChange={(e) => onChange('buyerName', e.target.value)}
            placeholder="Client Company Inc."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.address}</label>
          <textarea
            value={data.buyerAddress}
            onChange={(e) => onChange('buyerAddress', e.target.value)}
            placeholder="456 Client Street&#10;City, State ZIP"
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.phone}</label>
            <input
              type="text"
              value={data.buyerPhone}
              onChange={(e) => onChange('buyerPhone', e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.email}</label>
            <input
              type="email"
              value={data.buyerEmail}
              onChange={(e) => onChange('buyerEmail', e.target.value)}
              placeholder="client@example.com"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.taxId}</label>
          <input
            type="text"
            value={data.buyerTaxId}
            onChange={(e) => onChange('buyerTaxId', e.target.value)}
            placeholder="XX-XXXXXXX"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.bankAccounts}</label>
          <textarea
            value={data.buyerBankAccounts}
            onChange={(e) => onChange('buyerBankAccounts', e.target.value)}
            placeholder="Bank Name: Account Number&#10;IBAN: XX00 0000 0000 0000"
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}
