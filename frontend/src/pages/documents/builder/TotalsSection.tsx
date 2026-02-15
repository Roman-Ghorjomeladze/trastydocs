import type { InvoiceLabels } from '../../../lib/invoice-i18n.ts';
import { formatCurrency } from '../../../lib/invoice-utils.ts';

interface Props {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  labels: InvoiceLabels;
  onTaxRateChange: (rate: number) => void;
}

export function TotalsSection({ subtotal, taxRate, taxAmount, total, currency, labels, onTaxRateChange }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        {labels.totals}
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{labels.subtotal}</span>
          <span className="text-sm font-medium text-foreground">{formatCurrency(subtotal, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{labels.taxRate}</span>
            <div className="flex items-center">
              <input type="number" value={taxRate} onChange={(e) => onTaxRateChange(Math.max(0, Math.min(100, Number(e.target.value))))} min={0} max={100} step={0.1} className="w-16 px-2 py-1 border border-border rounded-md text-sm text-right focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
              <span className="ml-1 text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <span className="text-sm text-foreground">{formatCurrency(taxAmount, currency)}</span>
        </div>
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-foreground">{labels.total}</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
