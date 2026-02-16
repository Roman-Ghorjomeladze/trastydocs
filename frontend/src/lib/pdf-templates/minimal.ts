import { rgb } from 'pdf-lib';
import type { TemplateRenderFn } from './shared.ts';
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  CONTENT_WIDTH,
  LINE_HEIGHT,
  SECTION_GAP,
} from './shared.ts';
import { formatCurrency } from '../invoice-utils.ts';

// ── Colors — monochrome only ──
const BLACK = rgb(0, 0, 0);
const DARK = rgb(0.2, 0.2, 0.2);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.75, 0.75, 0.75);

const GAP = 28; // More whitespace between sections

export const renderMinimal: TemplateRenderFn = async (ctx) => {
  const { data, labels, isTransport, drawText, drawMultiline, textWidth } = ctx;

  let page = ctx.addPage();
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 30) {
      page = ctx.addPage();
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // ── Company name (top left, understated) ──
  drawText(page, data.companyName || 'Company', MARGIN, y, {
    size: 14,
    bold: false,
    color: BLACK,
  });

  // ── Invoice title (top right, regular weight) ──
  const invoiceTitle = isTransport ? labels.transportInvoice : labels.invoice;
  const titleWidth = textWidth(invoiceTitle, 12, false);
  drawText(page, invoiceTitle, PAGE_WIDTH - MARGIN - titleWidth, y, {
    size: 12,
    bold: false,
    color: DARK,
  });

  y -= 20;

  // ── Thin divider ──
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 0.5,
    color: LIGHT_GRAY,
  });

  y -= 16;

  // ── Company details (left) ──
  const companyDetails = [
    data.companyAddress,
    data.companyPhone ? `${labels.phone}: ${data.companyPhone}` : '',
    data.companyEmail ? `${labels.email}: ${data.companyEmail}` : '',
    data.companyTaxId ? `${labels.taxId}: ${data.companyTaxId}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const companyEndY = drawMultiline(page, companyDetails, MARGIN, y, {
    size: 8,
    color: GRAY,
  });

  // ── Invoice details (right) ──
  const rightX = PAGE_WIDTH - MARGIN - 140;
  let detailY = y;
  if (data.invoiceNumber) {
    drawText(page, `${labels.invoiceNumber}: ${data.invoiceNumber}`, rightX, detailY, { size: 8, bold: true, color: GRAY });
    detailY -= LINE_HEIGHT;
  }
  const detailsLines = [
    data.invoiceDate ? `${labels.invoiceDate}: ${data.invoiceDate}` : '',
    data.dueDate ? `${labels.dueDate}: ${data.dueDate}` : '',
  ].filter(Boolean);
  for (const line of detailsLines) {
    drawText(page, line, rightX, detailY, { size: 8, color: GRAY });
    detailY -= LINE_HEIGHT;
  }

  y = Math.min(companyEndY, detailY) - GAP;

  // ── Bill To ──
  ensureSpace(80);
  drawText(page, labels.billTo, MARGIN, y, { size: 8, bold: true, color: GRAY });
  y -= LINE_HEIGHT;

  drawText(page, data.buyerName || '-', MARGIN, y, { size: 10, bold: true, color: BLACK });
  y -= LINE_HEIGHT;

  const buyerDetails = [
    data.buyerAddress,
    data.buyerPhone ? `${labels.phone}: ${data.buyerPhone}` : '',
    data.buyerEmail ? `${labels.email}: ${data.buyerEmail}` : '',
    data.buyerTaxId ? `${labels.taxId}: ${data.buyerTaxId}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  y = drawMultiline(page, buyerDetails, MARGIN, y, { size: 8, color: GRAY });
  y -= GAP;

  // ── Transport Info ──
  if (isTransport) {
    const transportLines = [
      data.serviceDescription ? `${labels.serviceDescription}: ${data.serviceDescription}` : '',
      data.transportRoute ? `${labels.transportRoute}: ${data.transportRoute}` : '',
      data.vehicleModel ? `${labels.vehicleModel}: ${data.vehicleModel}` : '',
      data.vehiclePlate ? `${labels.vehiclePlate}: ${data.vehiclePlate}` : '',
      data.trailerPlate ? `${labels.trailerPlate}: ${data.trailerPlate}` : '',
    ].filter(Boolean);

    if (transportLines.length > 0) {
      ensureSpace(20 + transportLines.length * LINE_HEIGHT);
      drawText(page, labels.transportInfo, MARGIN, y, { size: 8, bold: true, color: GRAY });
      y -= LINE_HEIGHT;

      for (const line of transportLines) {
        drawText(page, line, MARGIN, y, { size: 8, color: DARK });
        y -= LINE_HEIGHT;
      }
      y -= GAP;
    }
  }

  // ── Line Items Table ──
  ensureSpace(60);
  const colWidths = [24, CONTENT_WIDTH - 24 - 50 - 75 - 75, 50, 75, 75];
  const colStarts = [MARGIN];
  for (let i = 1; i < colWidths.length; i++) {
    colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
  }

  // Header (bold text, no background)
  const headers = ['#', labels.description, labels.quantity, labels.unitPrice, labels.total];
  for (let i = 0; i < headers.length; i++) {
    drawText(page, headers[i], colStarts[i] + 3, y - 4, {
      size: 7,
      bold: true,
      color: GRAY,
    });
  }
  y -= 14;

  // Single thin line under header
  page.drawLine({
    start: { x: MARGIN, y: y + 2 },
    end: { x: MARGIN + CONTENT_WIDTH, y: y + 2 },
    thickness: 0.5,
    color: LIGHT_GRAY,
  });

  y -= 4;

  // Rows (no backgrounds, no borders)
  for (let idx = 0; idx < data.items.length; idx++) {
    ensureSpace(18);
    const item = data.items[idx];
    const rowY = y;

    drawText(page, String(idx + 1), colStarts[0] + 3, rowY - 6, { size: 8, color: LIGHT_GRAY });
    drawText(page, item.description || '', colStarts[1] + 3, rowY - 6, {
      size: 8,
      color: DARK,
      maxWidth: colWidths[1] - 6,
    });
    drawText(page, String(item.quantity), colStarts[2] + 3, rowY - 6, { size: 8, color: DARK });
    drawText(page, formatCurrency(item.unitPrice, data.currency), colStarts[3] + 3, rowY - 6, { size: 8, color: DARK });
    drawText(page, formatCurrency(item.total, data.currency), colStarts[4] + 3, rowY - 6, { size: 8, color: BLACK });

    y -= 16;
  }

  // Single thin line at table bottom
  page.drawLine({
    start: { x: MARGIN, y: y + 2 },
    end: { x: MARGIN + CONTENT_WIDTH, y: y + 2 },
    thickness: 0.5,
    color: LIGHT_GRAY,
  });

  y -= GAP;

  // ── Totals ──
  ensureSpace(60);
  const totalsX = PAGE_WIDTH - MARGIN - 160;
  const valuesX = PAGE_WIDTH - MARGIN - 10;

  const drawTotalRow = (label: string, value: string, opts: { bold?: boolean; size?: number } = {}) => {
    const { bold = false, size = 9 } = opts;
    drawText(page, label, totalsX, y, { size, color: GRAY });
    const valWidth = textWidth(value, size, bold);
    drawText(page, value, valuesX - valWidth, y, { size, bold, color: DARK });
    y -= LINE_HEIGHT;
  };

  drawTotalRow(`${labels.subtotal}:`, formatCurrency(data.subtotal, data.currency));
  if (data.taxRate > 0) {
    drawTotalRow(`${labels.tax} (${data.taxRate}%):`, formatCurrency(data.taxAmount, data.currency));
  }

  page.drawLine({
    start: { x: totalsX, y: y + 4 },
    end: { x: valuesX, y: y + 4 },
    thickness: 0.5,
    color: LIGHT_GRAY,
  });
  y -= 10;

  drawTotalRow(`${labels.total}:`, formatCurrency(data.total, data.currency), {
    bold: true,
    size: 11,
  });

  y -= GAP;

  // ── Amount in Words ──
  if (isTransport && data.amountInWords) {
    ensureSpace(30);
    drawText(page, `${labels.amountInWords}:`, MARGIN, y, { size: 8, bold: true, color: GRAY });
    y -= LINE_HEIGHT;
    drawText(page, data.amountInWords, MARGIN, y, { size: 9, color: DARK });
    y -= GAP;
  }

  // ── Bank Accounts ──
  if (data.companyBankAccounts) {
    ensureSpace(40);
    drawText(page, `${labels.paymentDetails}:`, MARGIN, y, { size: 8, bold: true, color: GRAY });
    y -= LINE_HEIGHT;
    y = drawMultiline(page, data.companyBankAccounts, MARGIN, y, { size: 8, color: DARK });
    y -= GAP;
  }

  // ── Payment Terms ──
  if (data.paymentTerms) {
    ensureSpace(30);
    drawText(page, `${labels.paymentTerms}:`, MARGIN, y, { size: 8, bold: true, color: GRAY });
    y -= LINE_HEIGHT;
    y = drawMultiline(page, data.paymentTerms, MARGIN, y, { size: 8, color: DARK });
    y -= GAP;
  }

  // ── Notes ──
  if (data.notes) {
    ensureSpace(30);
    drawText(page, `${labels.notes}:`, MARGIN, y, { size: 8, bold: true, color: GRAY });
    y -= LINE_HEIGHT;
    y = drawMultiline(page, data.notes, MARGIN, y, { size: 8, color: DARK });
    y -= GAP;
  }

  // ── Signature & Stamp ──
  const hasSignature = !!data.signatureImageUrl;
  const hasStamp = !!data.stampImageUrl;

  if (hasSignature || hasStamp || (isTransport && data.directorName)) {
    const sigBlockX = PAGE_WIDTH - MARGIN - 200;
    const sigBlockWidth = 200;

    const stampImage = hasStamp ? await ctx.embedImage(data.stampImageUrl) : null;
    const sigImage = hasSignature ? await ctx.embedImage(data.signatureImageUrl) : null;

    const stampDims = stampImage ? stampImage.scaleToFit(140, 140) : null;
    const sigDims = sigImage ? sigImage.scaleToFit(130, 65) : null;

    const imageBlockHeight = Math.max(stampDims?.height ?? 0, sigDims?.height ?? 0, 70);

    // Calculate actual space needed: images + gap + line + name + label
    // Use tight check (no extra 30pt buffer) since this is the last section on the page
    const neededSpace = imageBlockHeight + 8 + LINE_HEIGHT * 3;
    if (y - neededSpace < MARGIN) {
      page = ctx.addPage();
      y = PAGE_HEIGHT - MARGIN;
    }
    const imageCenterY = y - imageBlockHeight / 2;

    if (sigImage && sigDims) {
      page.drawImage(sigImage, {
        x: sigBlockX + (sigBlockWidth - sigDims.width) / 2,
        y: imageCenterY - sigDims.height / 2,
        width: sigDims.width,
        height: sigDims.height,
      });
    }

    if (stampImage && stampDims) {
      page.drawImage(stampImage, {
        x: sigBlockX + (sigBlockWidth - stampDims.width) / 2,
        y: imageCenterY - stampDims.height / 2,
        width: stampDims.width,
        height: stampDims.height,
        opacity: 0.85,
      });
    }

    y -= imageBlockHeight + 8;

    page.drawLine({
      start: { x: sigBlockX + 10, y },
      end: { x: sigBlockX + sigBlockWidth - 10, y },
      thickness: 0.3,
      color: LIGHT_GRAY,
    });
    y -= LINE_HEIGHT;

    const signerDisplayName = data.signerName || (isTransport ? data.directorName : '');
    if (signerDisplayName) {
      const nameWidth = textWidth(signerDisplayName, 8, false);
      drawText(page, signerDisplayName, sigBlockX + (sigBlockWidth - nameWidth) / 2, y, {
        size: 8,
        color: DARK,
      });
      y -= LINE_HEIGHT;
    }

    if (isTransport && data.directorName) {
      const dirLabel = labels.directorName;
      const dirLabelWidth = textWidth(dirLabel, 7, false);
      drawText(page, dirLabel, sigBlockX + (sigBlockWidth - dirLabelWidth) / 2, y, {
        size: 7,
        color: GRAY,
      });
    }
  }
};
