import { rgb } from 'pdf-lib';
import type { TemplateRenderFn } from './shared.ts';
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  CONTENT_WIDTH,
  LINE_HEIGHT,
  SECTION_GAP,
  clampCompanyName,
} from './shared.ts';
import { formatCurrency } from '../invoice-utils.ts';

// ── Colors ──
const RED = rgb(0.863, 0.149, 0.149);       // #DC2626
const CHARCOAL = rgb(0.122, 0.161, 0.216);   // #1F2937
const DARK = rgb(0.13, 0.13, 0.13);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
const WHITE = rgb(1, 1, 1);

const HEADER_HEIGHT = 80;

export const renderBold: TemplateRenderFn = async (ctx) => {
  const { data, labels, isTransport, drawText, drawMultiline, textWidth } = ctx;

  let page = ctx.addPage();
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 30) {
      page = ctx.addPage();
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // ── Large red header block ──
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - HEADER_HEIGHT,
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
    color: RED,
  });

  // Company name in white (inside red block, 40 char limit)
  drawText(page, clampCompanyName(data.companyName), MARGIN, PAGE_HEIGHT - 35, {
    size: 16,
    bold: true,
    color: WHITE,
    maxWidth: CONTENT_WIDTH,
  });

  // Invoice title below company name
  const invoiceTitle = isTransport
    ? labels.transportInvoice.toUpperCase()
    : labels.invoice.toUpperCase();
  drawText(page, invoiceTitle, MARGIN, PAGE_HEIGHT - 55, {
    size: 12,
    bold: true,
    color: rgb(1, 0.8, 0.8), // light pink
  });

  // Invoice details in header (right side)
  const detailsLines = [
    data.invoiceNumber ? `${labels.invoiceNumber}: ${data.invoiceNumber}` : '',
    data.invoiceDate ? `${labels.invoiceDate}: ${data.invoiceDate}` : '',
    data.dueDate ? `${labels.dueDate}: ${data.dueDate}` : '',
  ].filter(Boolean);

  let detailY = PAGE_HEIGHT - 30;
  for (let i = 0; i < detailsLines.length; i++) {
    const isFirst = i === 0 && data.invoiceNumber;
    const lineWidth = textWidth(detailsLines[i], 9, !!isFirst);
    drawText(page, detailsLines[i], PAGE_WIDTH - MARGIN - lineWidth, detailY, {
      size: 9,
      bold: !!isFirst,
      color: rgb(1, 0.9, 0.9),
    });
    detailY -= LINE_HEIGHT;
  }

  y = PAGE_HEIGHT - HEADER_HEIGHT - SECTION_GAP;

  // ── Company details (with red left accent bar) ──
  const companyDetails = [
    data.companyAddress ? `${labels.address}: ${data.companyAddress}` : '',
    data.companyPhone ? `${labels.phone}: ${data.companyPhone}` : '',
    data.companyEmail ? `${labels.email}: ${data.companyEmail}` : '',
    data.companyTaxId ? `${labels.taxId}: ${data.companyTaxId}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (companyDetails) {
    const detailLines = companyDetails.split('\n').filter((l) => l.trim());
    const barHeight = detailLines.length * LINE_HEIGHT + 4;

    // Red accent bar
    page.drawRectangle({
      x: MARGIN,
      y: y - barHeight + 6,
      width: 3,
      height: barHeight,
      color: RED,
    });

    y = drawMultiline(page, companyDetails, MARGIN + 12, y, {
      size: 9,
      color: GRAY,
    });
    y -= SECTION_GAP;
  }

  // ── Bill To (with red left accent bar) ──
  ensureSpace(80);
  drawText(page, `${labels.billTo}:`, MARGIN, y, { size: 10, bold: true, color: RED });
  y -= LINE_HEIGHT + 2;

  drawText(page, data.buyerName || '-', MARGIN + 12, y, { size: 12, bold: true, color: CHARCOAL });
  y -= LINE_HEIGHT + 2;

  const buyerDetails = [
    data.buyerAddress ? `${labels.address}: ${data.buyerAddress}` : '',
    data.buyerPhone ? `${labels.phone}: ${data.buyerPhone}` : '',
    data.buyerEmail ? `${labels.email}: ${data.buyerEmail}` : '',
    data.buyerTaxId ? `${labels.taxId}: ${data.buyerTaxId}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (buyerDetails) {
    const buyerLines = buyerDetails.split('\n').filter((l) => l.trim());
    const barHeight = buyerLines.length * LINE_HEIGHT + 4;

    page.drawRectangle({
      x: MARGIN,
      y: y - barHeight + 6,
      width: 3,
      height: barHeight,
      color: RED,
    });

    y = drawMultiline(page, buyerDetails, MARGIN + 12, y, { size: 9, color: GRAY });
  }
  y -= SECTION_GAP;

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
      drawText(page, `${labels.transportInfo}:`, MARGIN, y, { size: 10, bold: true, color: RED });
      y -= LINE_HEIGHT + 2;

      const barHeight = transportLines.length * LINE_HEIGHT + 4;
      page.drawRectangle({
        x: MARGIN,
        y: y - barHeight + 6,
        width: 3,
        height: barHeight,
        color: RED,
      });

      for (const line of transportLines) {
        drawText(page, line, MARGIN + 12, y, { size: 9, color: DARK });
        y -= LINE_HEIGHT;
      }
      y -= SECTION_GAP;
    }
  }

  // ── Line Items Table ──
  ensureSpace(60);
  const colWidths = [30, CONTENT_WIDTH - 30 - 60 - 80 - 80, 60, 80, 80];
  const colStarts = [MARGIN];
  for (let i = 1; i < colWidths.length; i++) {
    colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
  }

  // Thick red table header
  const headerHeight = 24;
  page.drawRectangle({
    x: MARGIN,
    y: y - headerHeight + 4,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: RED,
  });

  const headers = ['#', labels.description, labels.quantity, labels.unitPrice, labels.total];
  for (let i = 0; i < headers.length; i++) {
    drawText(page, headers[i], colStarts[i] + 4, y - 12, {
      size: 8,
      bold: true,
      color: WHITE,
    });
  }

  y -= headerHeight + 2;

  // Rows with solid separators
  for (let idx = 0; idx < data.items.length; idx++) {
    ensureSpace(22);
    const item = data.items[idx];
    const rowY = y;

    drawText(page, String(idx + 1), colStarts[0] + 4, rowY - 8, { size: 9, color: GRAY });
    drawText(page, item.description || '', colStarts[1] + 4, rowY - 8, {
      size: 9,
      maxWidth: colWidths[1] - 8,
    });
    drawText(page, String(item.quantity), colStarts[2] + 4, rowY - 8, { size: 9 });
    drawText(page, formatCurrency(item.unitPrice, data.currency), colStarts[3] + 4, rowY - 8, { size: 9 });
    drawText(page, formatCurrency(item.total, data.currency), colStarts[4] + 4, rowY - 8, { size: 9, bold: true });

    y -= 20;

    // Row separator
    page.drawLine({
      start: { x: MARGIN, y: y + 2 },
      end: { x: MARGIN + CONTENT_WIDTH, y: y + 2 },
      thickness: 0.5,
      color: LIGHT_GRAY,
    });
  }

  y -= SECTION_GAP;

  // ── Totals ──
  ensureSpace(70);
  const totalsX = PAGE_WIDTH - MARGIN - 200;
  const valuesX = PAGE_WIDTH - MARGIN - 10;

  const drawTotalRow = (label: string, value: string, opts: { bold?: boolean; size?: number; accent?: boolean } = {}) => {
    const { bold = false, size = 10, accent = false } = opts;
    drawText(page, label, totalsX, y, { size, color: GRAY });
    const valWidth = textWidth(value, size, bold);
    drawText(page, value, valuesX - valWidth, y, { size, bold, color: accent ? RED : DARK });
    y -= LINE_HEIGHT + 2;
  };

  drawTotalRow(`${labels.subtotal}:`, formatCurrency(data.subtotal, data.currency));
  if (data.taxRate > 0) {
    drawTotalRow(`${labels.tax} (${data.taxRate}%):`, formatCurrency(data.taxAmount, data.currency));
  }

  // Red divider before total
  page.drawLine({
    start: { x: totalsX, y: y + 4 },
    end: { x: valuesX, y: y + 4 },
    thickness: 2,
    color: RED,
  });
  y -= 14;

  drawTotalRow(`${labels.total}:`, formatCurrency(data.total, data.currency), {
    bold: true,
    size: 14,
    accent: true,
  });

  y -= SECTION_GAP;

  // ── Amount in Words ──
  if (isTransport && data.amountInWords) {
    ensureSpace(30);
    drawText(page, `${labels.amountInWords}:`, MARGIN, y, { size: 10, bold: true, color: RED });
    y -= LINE_HEIGHT;
    drawText(page, data.amountInWords, MARGIN, y, { size: 10, color: DARK });
    y -= SECTION_GAP;
  }

  // ── Bank Accounts ──
  if (data.companyBankAccounts) {
    ensureSpace(40);
    drawText(page, `${labels.paymentDetails}:`, MARGIN, y, { size: 10, bold: true, color: RED });
    y -= LINE_HEIGHT;
    y = drawMultiline(page, data.companyBankAccounts, MARGIN, y, { size: 9, color: DARK });
    y -= SECTION_GAP;
  }

  // ── Payment Terms ──
  if (data.paymentTerms) {
    ensureSpace(30);
    drawText(page, `${labels.paymentTerms}:`, MARGIN, y, { size: 10, bold: true, color: RED });
    y -= LINE_HEIGHT;
    y = drawMultiline(page, data.paymentTerms, MARGIN, y, { size: 9, color: DARK });
    y -= SECTION_GAP;
  }

  // ── Notes ──
  if (data.notes) {
    ensureSpace(30);
    drawText(page, `${labels.notes}:`, MARGIN, y, { size: 10, bold: true, color: RED });
    y -= LINE_HEIGHT;
    y = drawMultiline(page, data.notes, MARGIN, y, { size: 9, color: DARK });
    y -= SECTION_GAP;
  }

  // ── Signature & Stamp ──
  const hasSignature = !!data.signatureImageUrl;
  const hasStamp = !!data.stampImageUrl;

  if (hasSignature || hasStamp || (isTransport && data.directorName)) {
    const sigBlockX = PAGE_WIDTH - MARGIN - 220;
    const sigBlockWidth = 220;

    const stampImage = hasStamp ? await ctx.embedImage(data.stampImageUrl) : null;
    const sigImage = hasSignature ? await ctx.embedImage(data.signatureImageUrl) : null;

    const stampDims = stampImage ? stampImage.scaleToFit(150, 150) : null;
    const sigDims = sigImage ? sigImage.scaleToFit(140, 70) : null;

    const imageBlockHeight = Math.max(stampDims?.height ?? 0, sigDims?.height ?? 0, 80);

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

    // Red accent signature line
    page.drawLine({
      start: { x: sigBlockX + 10, y },
      end: { x: sigBlockX + sigBlockWidth - 10, y },
      thickness: 1,
      color: RED,
    });
    y -= LINE_HEIGHT;

    const signerDisplayName = data.signerName || (isTransport ? data.directorName : '');
    if (signerDisplayName) {
      const nameWidth = textWidth(signerDisplayName, 9, false);
      drawText(page, signerDisplayName, sigBlockX + (sigBlockWidth - nameWidth) / 2, y, {
        size: 9,
        color: CHARCOAL,
      });
      y -= LINE_HEIGHT;
    }

    if (isTransport && data.directorName) {
      const dirLabel = labels.directorName;
      const dirLabelWidth = textWidth(dirLabel, 8, false);
      drawText(page, dirLabel, sigBlockX + (sigBlockWidth - dirLabelWidth) / 2, y, {
        size: 8,
        color: GRAY,
      });
    }
  }
};
