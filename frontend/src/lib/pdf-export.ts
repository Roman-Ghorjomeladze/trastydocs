import type { InvoiceData, TemplateStyle } from '../types/index.ts';
import { createTemplateContext } from './pdf-templates/shared.ts';
import { TEMPLATE_REGISTRY } from './pdf-templates/index.ts';

/**
 * Generate a professional invoice PDF from structured InvoiceData.
 * Delegates rendering to the selected template (defaults to 'classic').
 * Uses pdf-lib with Noto Sans custom fonts for full Unicode support
 * (Latin, Cyrillic, Georgian, Turkish).
 */
export async function exportInvoicePdf(
  data: InvoiceData,
): Promise<Uint8Array> {
  const templateName: TemplateStyle = data.template || 'classic';
  const renderFn = TEMPLATE_REGISTRY[templateName];

  if (!renderFn) {
    throw new Error(`Unknown invoice template: ${templateName}`);
  }

  const ctx = await createTemplateContext(data);
  await renderFn(ctx);
  return ctx.pdfDoc.save();
}
