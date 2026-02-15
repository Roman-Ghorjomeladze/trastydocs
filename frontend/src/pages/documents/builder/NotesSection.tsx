import type { InvoiceLabels } from '../../../lib/invoice-i18n.ts';

interface Props {
  notes: string;
  paymentTerms: string;
  labels: InvoiceLabels;
  onChange: (field: string, value: string) => void;
}

export function NotesSection({ notes, paymentTerms, labels, onChange }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        {labels.notesAndTerms}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.paymentTerms}</label>
          <textarea value={paymentTerms} onChange={(e) => onChange('paymentTerms', e.target.value)} placeholder="Net 30, payment due within 30 days of invoice date..." rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.notes}</label>
          <textarea value={notes} onChange={(e) => onChange('notes', e.target.value)} placeholder="Thank you for your business..." rows={3} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none" />
        </div>
      </div>
    </div>
  );
}
