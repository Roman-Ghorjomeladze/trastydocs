import { rgb, PDFName, PDFArray, PDFString } from 'pdf-lib';
import type { InvoiceData, TemplateStyle } from '../types/index.ts';
import { createTemplateContext, PAGE_WIDTH } from './pdf-templates/shared.ts';
import { TEMPLATE_REGISTRY } from './pdf-templates/index.ts';

/**
 * Generate a professional invoice PDF from structured InvoiceData.
 * Delegates rendering to the selected template (defaults to 'classic').
 * Uses pdf-lib with Noto Sans custom fonts for full Unicode support
 * (Latin, Cyrillic, Georgian, Turkish).
 */
export async function exportInvoicePdf(
  data: InvoiceData,
  referralCode?: string,
): Promise<Uint8Array> {
  const templateName: TemplateStyle = data.template || 'classic';
  const renderFn = TEMPLATE_REGISTRY[templateName];

  if (!renderFn) {
    throw new Error(`Unknown invoice template: ${templateName}`);
  }

  const ctx = await createTemplateContext(data);
  await renderFn(ctx);

  // Draw "Powered By TrastyDocs" footer with referral link on the last page
  const pages = ctx.pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const footerText = 'Powered By TrastyDocs';
  const footerUrl = referralCode
    ? `https://trastydocs.com?ref=${referralCode}`
    : 'https://trastydocs.com';

  const footerSize = 10;
  const footerColor = rgb(0.741, 0.576, 0.976); // Accent purple #BD93F9
  const footerWidth = ctx.textWidth(footerText, footerSize, true);
  const footerX = (PAGE_WIDTH - footerWidth) / 2;
  const footerY = 28;

  ctx.drawText(lastPage, footerText, footerX, footerY, {
    size: footerSize,
    color: footerColor,
    bold: true,
  });

  // Add clickable link annotation over the footer text
  try {
    const linkAnnotation = ctx.pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [footerX - 2, footerY - 2, footerX + footerWidth + 2, footerY + footerSize + 2],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(footerUrl),
      },
    });
    const existingAnnots = lastPage.node.lookup(PDFName.of('Annots'));
    if (existingAnnots instanceof PDFArray) {
      existingAnnots.push(ctx.pdfDoc.context.register(linkAnnotation));
    } else {
      lastPage.node.set(
        PDFName.of('Annots'),
        ctx.pdfDoc.context.obj([ctx.pdfDoc.context.register(linkAnnotation)]),
      );
    }
  } catch (err) {
    console.error('[PDF] Failed to add link annotation:', err);
  }

  return ctx.pdfDoc.save();
}
