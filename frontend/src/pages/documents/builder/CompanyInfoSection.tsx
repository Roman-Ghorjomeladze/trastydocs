import type { InvoiceData } from '../../../types/index.ts';
import type { InvoiceLabels } from '../../../lib/invoice-i18n.ts';

interface Props {
  data: Pick<
    InvoiceData,
    'companyName' | 'companyAddress' | 'companyTaxId' | 'companyBankAccounts' | 'companyPhone' | 'companyEmail'
  >;
  labels: InvoiceLabels;
  onChange: (field: string, value: string) => void;
  onAutoFill?: () => void;
}

export function CompanyInfoSection({ data, labels, onChange, onAutoFill }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {labels.companySeller}
        </h3>
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

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.companyName}</label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => onChange('companyName', e.target.value)}
            placeholder="Your Company LLC"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.address}</label>
          <textarea
            value={data.companyAddress}
            onChange={(e) => onChange('companyAddress', e.target.value)}
            placeholder="123 Business Ave, Suite 100&#10;City, State ZIP"
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.phone}</label>
            <input
              type="text"
              value={data.companyPhone}
              onChange={(e) => onChange('companyPhone', e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.email}</label>
            <input
              type="email"
              value={data.companyEmail}
              onChange={(e) => onChange('companyEmail', e.target.value)}
              placeholder="billing@company.com"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.taxId}</label>
          <input
            type="text"
            value={data.companyTaxId}
            onChange={(e) => onChange('companyTaxId', e.target.value)}
            placeholder="XX-XXXXXXX"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.bankAccounts}</label>
          <textarea
            value={data.companyBankAccounts}
            onChange={(e) => onChange('companyBankAccounts', e.target.value)}
            placeholder="Bank Name: Account Number&#10;IBAN: XX00 0000 0000 0000"
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}
