import type { InvoiceLineItem } from '../../../types/index.ts';
import type { InvoiceLabels } from '../../../lib/invoice-i18n.ts';
import { createLineItem } from '../../../lib/invoice-utils.ts';
import { formatCurrency } from '../../../lib/invoice-utils.ts';

interface Props {
  items: InvoiceLineItem[];
  currency: string;
  labels: InvoiceLabels;
  onChange: (items: InvoiceLineItem[]) => void;
}

export function LineItemsSection({ items, currency, labels, onChange }: Props) {
  const handleItemChange = (
    index: number,
    field: keyof InvoiceLineItem,
    value: string | number,
  ) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : item.quantity;
        const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
        next.total = Math.round(qty * price * 100) / 100;
      }
      return next;
    });
    onChange(updated);
  };

  const handleAddItem = () => {
    onChange([...items, createLineItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        {labels.lineItems}
      </h3>

      <div className="grid grid-cols-[32px_1fr_72px_100px_100px_32px] gap-2 mb-2 px-1">
        <span className="text-xs font-medium text-muted-foreground">#</span>
        <span className="text-xs font-medium text-muted-foreground">{labels.description}</span>
        <span className="text-xs font-medium text-muted-foreground">{labels.quantity}</span>
        <span className="text-xs font-medium text-muted-foreground">{labels.unitPrice}</span>
        <span className="text-xs font-medium text-muted-foreground">{labels.total}</span>
        <span />
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[32px_1fr_72px_100px_100px_32px] gap-2 items-center group">
            <span className="text-xs text-muted-foreground text-center">{index + 1}</span>
            <input type="text" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} placeholder={labels.description} className="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
            <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Math.max(0, Number(e.target.value)))} min={0} step={1} className="w-full px-2 py-1.5 border border-border rounded-md text-sm text-right focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
            <input type="number" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', Math.max(0, Number(e.target.value)))} min={0} step={0.01} className="w-full px-2 py-1.5 border border-border rounded-md text-sm text-right focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
            <div className="text-sm text-foreground text-right pr-1 font-medium">{formatCurrency(item.total, currency)}</div>
            <button type="button" onClick={() => handleRemoveItem(index)} disabled={items.length <= 1} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors opacity-0 group-hover:opacity-100" title="Remove item">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={handleAddItem} className="mt-3 w-full py-2 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-accent hover:border-accent transition-colors flex items-center justify-center gap-1.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {labels.addItem}
      </button>
    </div>
  );
}
