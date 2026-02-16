import { rgb } from 'pdf-lib';
import type { TemplateRenderFn } from './shared.ts';
import { PAGE_WIDTH, PAGE_HEIGHT } from './shared.ts';
import { formatCurrency } from '../invoice-utils.ts';

// ── Compact layout constants ──
const M = 35; // Tighter margins
const CW = PAGE_WIDTH - M * 2;
const LH = 11; // Tighter line height
const GAP = 10;

// ── Colors ──
const SLATE = rgb(0.278, 0.333, 0.412);    // #475569
const DARK = rgb(0.13, 0.13, 0.13);
const GRAY = rgb(0.42, 0.45, 0.50);        // #6B7280
const LIGHT_BG = rgb(0.957, 0.961, 0.969); // #F4F5F7
const BORDER = rgb(0.82, 0.84, 0.86);
const WHITE = rgb(1, 1, 1);

export const renderCompact: TemplateRenderFn = async (ctx) => {
  const { data, labels, isTransport, drawText, drawMultiline, textWidth } = ctx;

  let page = ctx.addPage();
  let y = PAGE_HEIGHT - M;

  const ensureSpace = (needed: number) => {
    if (y - needed < M + 20) {
      page = ctx.addPage();
      y = PAGE_HEIGHT - M;
    }
  };

  // ── Header: Company + Invoice title on same line ──
  drawText(page, data.companyName || 'Company', M, y, {
    size: 12,
    bold: true,
    color: SLATE,
  });

  const invoiceTitle = isTransport
    ? labels.transportInvoice.toUpperCase()
    : labels.invoice.toUpperCase();
  const titleWidth = textWidth(invoiceTitle, 14, true);
  drawText(page, invoiceTitle, PAGE_WIDTH - M - titleWidth, y, {
    size: 14,
    bold: true,
    color: SLATE,
  });

  y -= 14;

  // Thin divider
  page.drawLine({
    start: { x: M, y },
    end: { x: M + CW, y },
    thickness: 0.5,
    color: BORDER,
  });
  y -= 8;

  // ── Two-column layout: Company (left) + Buyer (right) ──
  const halfWidth = (CW - 20) / 2;
  const leftX = M;
  const rightX = M + halfWidth + 20;

  // Invoice details above the two columns (right-aligned)
  const detailsLines = [
    data.invoiceNumber ? `${labels.invoiceNumber}: ${data.invoiceNumber}` : '',
    data.invoiceDate ? `${labels.invoiceDate}: ${data.invoiceDate}` : '',
    data.dueDate ? `${labels.dueDate}: ${data.dueDate}` : '',
  ].filter(Boolean);

  let detailY = y;
  for (let i = 0; i < detailsLines.length; i++) {
    const isFirst = i === 0 && data.invoiceNumber;
    const lineW = textWidth(detailsLines[i], 7, !!isFirst);
    drawText(page, detailsLines[i], PAGE_WIDTH - M - lineW, detailY, { size: 7, bold: !!isFirst, color: GRAY });
    detailY -= LH;
  }

  // Company details (left column)
  drawText(page, labels.companySeller, leftX, y, { size: 7, bold: true, color: SLATE });
  y -= LH;
  let leftY = y;

  const companyLines = [
    data.companyName,
    data.companyAddress,
    data.companyPhone ? `${labels.phone}: ${data.companyPhone}` : '',
    data.companyEmail ? `${labels.email}: ${data.companyEmail}` : '',
    data.companyTaxId ? `${labels.taxId}: ${data.companyTaxId}` : '',
  ].filter(Boolean);

  for (const line of companyLines) {
    drawText(page, line, leftX, leftY, { size: 7, color: DARK, maxWidth: halfWidth });
    leftY -= LH;
  }

  // Buyer details (right column)
  drawText(page, labels.buyerClient, rightX, y, { size: 7, bold: true, color: SLATE });
  let rightY = y - LH;

  const buyerLines = [
    data.buyerName || '-',
    data.buyerAddress,
    data.buyerPhone ? `${labels.phone}: ${data.buyerPhone}` : '',
    data.buyerEmail ? `${labels.email}: ${data.buyerEmail}` : '',
    data.buyerTaxId ? `${labels.taxId}: ${data.buyerTaxId}` : '',
  ].filter(Boolean);

  for (const line of buyerLines) {
    drawText(page, line, rightX, rightY, { size: 7, color: DARK, maxWidth: halfWidth });
    rightY -= LH;
  }

  y = Math.min(leftY, rightY, detailY) - GAP;

  // ── Transport Info (compact) ──
  if (isTransport) {
    const transportLines = [
      data.serviceDescription ? `${labels.serviceDescription}: ${data.serviceDescription}` : '',
      data.transportRoute ? `${labels.transportRoute}: ${data.transportRoute}` : '',
      data.vehicleModel ? `${labels.vehicleModel}: ${data.vehicleModel}` : '',
      data.vehiclePlate ? `${labels.vehiclePlate}: ${data.vehiclePlate}` : '',
      data.trailerPlate ? `${labels.trailerPlate}: ${data.trailerPlate}` : '',
    ].filter(Boolean);

    if (transportLines.length > 0) {
      ensureSpace(10 + transportLines.length * LH);

      page.drawLine({
        start: { x: M, y: y + 4 },
        end: { x: M + CW, y: y + 4 },
        thickness: 0.3,
        color: BORDER,
      });

      drawText(page, labels.transportInfo, M, y, { size: 7, bold: true, color: SLATE });
      y -= LH;

      for (const line of transportLines) {
        drawText(page, line, M, y, { size: 7, color: DARK });
        y -= LH;
      }
      y -= GAP;
    }
  }

  // ── Line Items Table ──
  ensureSpace(40);
  const colWidths = [20, CW - 20 - 40 - 65 - 65, 40, 65, 65];
  const colStarts = [M];
  for (let i = 1; i < colWidths.length; i++) {
    colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
  }

  // Table header (slate background)
  const headerHeight = 16;
  page.drawRectangle({
    x: M,
    y: y - headerHeight + 4,
    width: CW,
    height: headerHeight,
    color: SLATE,
  });

  const headers = ['#', labels.description, labels.quantity, labels.unitPrice, labels.total];
  for (let i = 0; i < headers.length; i++) {
    drawText(page, headers[i], colStarts[i] + 3, y - 8, {
      size: 6,
      bold: true,
      color: WHITE,
    });
  }

  y -= headerHeight;

  // Table rows (compact)
  for (let idx = 0; idx < data.items.length; idx++) {
    ensureSpace(16);
    const item = data.items[idx];
    const rowY = y;

    // Alternating light background
    if (idx % 2 === 0) {
      page.drawRectangle({
        x: M,
        y: rowY - 10,
        width: CW,
        height: 14,
        color: LIGHT_BG,
      });
    }

    drawText(page, String(idx + 1), colStarts[0] + 3, rowY - 5, { size: 7, color: GRAY });
    drawText(page, item.description || '', colStarts[1] + 3, rowY - 5, {
      size: 7,
      maxWidth: colWidths[1] - 6,
    });
    drawText(page, String(item.quantity), colStarts[2] + 3, rowY - 5, { size: 7 });
    drawText(page, formatCurrency(item.unitPrice, data.currency), colStarts[3] + 3, rowY - 5, { size: 7 });
    drawText(page, formatCurrency(item.total, data.currency), colStarts[4] + 3, rowY - 5, { size: 7 });

    y -= 14;
  }

  // Table bottom border
  page.drawLine({
    start: { x: M, y: y + 2 },
    end: { x: M + CW, y: y + 2 },
    thickness: 0.5,
    color: BORDER,
  });

  y -= GAP;

  // ── Totals ──
  ensureSpace(50);
  const totalsX = PAGE_WIDTH - M - 150;
  const valuesX = PAGE_WIDTH - M - 5;

  const drawTotalRow = (label: string, value: string, opts: { bold?: boolean; size?: number } = {}) => {
    const { bold = false, size = 8 } = opts;
    drawText(page, label, totalsX, y, { size, color: GRAY });
    const valWidth = textWidth(value, size, bold);
    drawText(page, value, valuesX - valWidth, y, { size, bold, color: DARK });
    y -= LH + 1;
  };

  drawTotalRow(`${labels.subtotal}:`, formatCurrency(data.subtotal, data.currency));
  if (data.taxRate > 0) {
    drawTotalRow(`${labels.tax} (${data.taxRate}%):`, formatCurrency(data.taxAmount, data.currency));
  }

  page.drawLine({
    start: { x: totalsX, y: y + 3 },
    end: { x: valuesX, y: y + 3 },
    thickness: 0.8,
    color: SLATE,
  });
  y -= 8;

  drawTotalRow(`${labels.total}:`, formatCurrency(data.total, data.currency), {
    bold: true,
    size: 10,
  });

  y -= GAP;

  // ── Amount in Words ──
  if (isTransport && data.amountInWords) {
    ensureSpace(20);
    drawText(page, `${labels.amountInWords}: ${data.amountInWords}`, M, y, { size: 7, color: DARK });
    y -= GAP + LH;
  }

  // ── Bank Accounts + Payment Terms + Notes (compact, side by side where possible) ──
  const hasBank = !!data.companyBankAccounts;
  const hasTerms = !!data.paymentTerms;
  const hasNotes = !!data.notes;

  if (hasBank) {
    ensureSpace(30);
    drawText(page, `${labels.paymentDetails}:`, M, y, { size: 7, bold: true, color: SLATE });
    y -= LH;
    y = drawMultiline(page, data.companyBankAccounts, M, y, { size: 7, color: DARK, lineHeight: LH });
    y -= GAP;
  }

  if (hasTerms) {
    ensureSpace(20);
    drawText(page, `${labels.paymentTerms}:`, M, y, { size: 7, bold: true, color: SLATE });
    y -= LH;
    y = drawMultiline(page, data.paymentTerms, M, y, { size: 7, color: DARK, lineHeight: LH });
    y -= GAP;
  }

  if (hasNotes) {
    ensureSpace(20);
    drawText(page, `${labels.notes}:`, M, y, { size: 7, bold: true, color: SLATE });
    y -= LH;
    y = drawMultiline(page, data.notes, M, y, { size: 7, color: DARK, lineHeight: LH });
    y -= GAP;
  }

  // ── Signature & Stamp (compact) ──
  const hasSignature = !!data.signatureImageUrl;
  const hasStamp = !!data.stampImageUrl;

  if (hasSignature || hasStamp || (isTransport && data.directorName)) {
    const sigBlockX = PAGE_WIDTH - M - 180;
    const sigBlockWidth = 180;

    const stampImage = hasStamp ? await ctx.embedImage(data.stampImageUrl) : null;
    const sigImage = hasSignature ? await ctx.embedImage(data.signatureImageUrl) : null;

    const stampDims = stampImage ? stampImage.scaleToFit(120, 120) : null;
    const sigDims = sigImage ? sigImage.scaleToFit(110, 55) : null;

    const imageBlockHeight = Math.max(stampDims?.height ?? 0, sigDims?.height ?? 0, 60);

    // Calculate actual space needed: images + gap + line + name + label
    // Use tight check (no extra buffer) since this is the last section on the page
    const neededSpace = imageBlockHeight + 8 + LH * 3;
    if (y - neededSpace < M) {
      page = ctx.addPage();
      y = PAGE_HEIGHT - M;
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

    y -= imageBlockHeight + 6;

    page.drawLine({
      start: { x: sigBlockX + 10, y },
      end: { x: sigBlockX + sigBlockWidth - 10, y },
      thickness: 0.5,
      color: SLATE,
    });
    y -= LH;

    const signerDisplayName = data.signerName || (isTransport ? data.directorName : '');
    if (signerDisplayName) {
      const nameWidth = textWidth(signerDisplayName, 7, false);
      drawText(page, signerDisplayName, sigBlockX + (sigBlockWidth - nameWidth) / 2, y, {
        size: 7,
        color: DARK,
      });
      y -= LH;
    }

    if (isTransport && data.directorName) {
      const dirLabel = labels.directorName;
      const dirLabelWidth = textWidth(dirLabel, 6, false);
      drawText(page, dirLabel, sigBlockX + (sigBlockWidth - dirLabelWidth) / 2, y, {
        size: 6,
        color: GRAY,
      });
    }
  }
};
