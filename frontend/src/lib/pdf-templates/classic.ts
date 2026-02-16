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

// ── Colors ──
const BLUE = rgb(0.145, 0.388, 0.922);
const DARK = rgb(0.13, 0.13, 0.13);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
const WHITE = rgb(1, 1, 1);

export const renderClassic: TemplateRenderFn = async (ctx) => {
  const { data, labels, isTransport, drawText, drawMultiline, textWidth } = ctx;

  let page = ctx.addPage();
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 30) {
      page = ctx.addPage();
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // ── Company Name (top left, large) ──
  drawText(page, data.companyName || 'Company', MARGIN, y, {
    size: 18,
    bold: true,
    color: DARK,
  });

  // ── INVOICE title (top right, blue) ──
  const invoiceTitle = isTransport
    ? labels.transportInvoice.toUpperCase()
    : labels.invoice.toUpperCase();
  const titleWidth = textWidth(invoiceTitle, 24, true);
  drawText(page, invoiceTitle, PAGE_WIDTH - MARGIN - titleWidth, y, {
    size: 24,
    bold: true,
    color: BLUE,
  });

  y -= 30;

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
    size: 9,
    color: GRAY,
  });

  // ── Invoice details (right) ──
  const rightX = PAGE_WIDTH - MARGIN - 150;
  let detailY = y;
  if (data.invoiceNumber) {
    drawText(page, `${labels.invoiceNumber}: ${data.invoiceNumber}`, rightX, detailY, { size: 9, bold: true, color: GRAY });
    detailY -= LINE_HEIGHT;
  }
  const detailsLines = [
    data.invoiceDate ? `${labels.invoiceDate}: ${data.invoiceDate}` : '',
    data.dueDate ? `${labels.dueDate}: ${data.dueDate}` : '',
  ].filter(Boolean);
  for (const line of detailsLines) {
    drawText(page, line, rightX, detailY, { size: 9, color: GRAY });
    detailY -= LINE_HEIGHT;
  }

  y = Math.min(companyEndY, detailY) - 10;

  // Divider after company/invoice details
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 0.5,
    color: LIGHT_GRAY,
  });
  y -= SECTION_GAP;

  // ── Bill To section ──
  ensureSpace(80);
  drawText(page, `${labels.billTo}:`, MARGIN, y, { size: 10, bold: true, color: GRAY });
  y -= LINE_HEIGHT + 4;

  drawText(page, data.buyerName || '-', MARGIN, y, { size: 11, bold: true });
  y -= LINE_HEIGHT;

  const buyerDetails = [
    data.buyerAddress,
    data.buyerPhone ? `${labels.phone}: ${data.buyerPhone}` : '',
    data.buyerEmail ? `${labels.email}: ${data.buyerEmail}` : '',
    data.buyerTaxId ? `${labels.taxId}: ${data.buyerTaxId}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  y = drawMultiline(page, buyerDetails, MARGIN, y, { size: 9, color: GRAY });
  y -= SECTION_GAP + 4;

  // ── Transport Info Section ──
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

      drawText(page, `${labels.transportInfo}:`, MARGIN, y, {
        size: 10,
        bold: true,
        color: GRAY,
      });
      y -= LINE_HEIGHT + 6;

      const boxHeight = transportLines.length * LINE_HEIGHT + 16;
      page.drawRectangle({
        x: MARGIN,
        y: y - boxHeight + 12,
        width: CONTENT_WIDTH,
        height: boxHeight,
        color: rgb(0.96, 0.97, 1),
        borderColor: rgb(0.85, 0.88, 0.95),
        borderWidth: 0.5,
      });

      for (const line of transportLines) {
        drawText(page, line, MARGIN + 8, y, { size: 9, color: DARK });
        y -= LINE_HEIGHT;
      }

      y -= SECTION_GAP + 4;
    }
  }

  // ── Line Items Table ──
  ensureSpace(60);
  const colWidths = [30, CONTENT_WIDTH - 30 - 60 - 80 - 80, 60, 80, 80];
  const colStarts = [MARGIN];
  for (let i = 1; i < colWidths.length; i++) {
    colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
  }

  // Table header
  const headerHeight = 24;
  page.drawRectangle({
    x: MARGIN,
    y: y - headerHeight + 4,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: BLUE,
  });

  const headers = ['#', labels.description, labels.quantity, labels.unitPrice, labels.total];
  for (let i = 0; i < headers.length; i++) {
    drawText(page, headers[i], colStarts[i] + 4, y - 12, {
      size: 8,
      bold: true,
      color: WHITE,
    });
  }

  y -= headerHeight + 4;

  // Table rows
  for (let idx = 0; idx < data.items.length; idx++) {
    ensureSpace(22);
    const item = data.items[idx];
    const rowY = y;

    if (idx % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: rowY - 14,
        width: CONTENT_WIDTH,
        height: 20,
        color: LIGHT_GRAY,
      });
    }

    drawText(page, String(idx + 1), colStarts[0] + 4, rowY - 8, { size: 9 });
    drawText(page, item.description || '', colStarts[1] + 4, rowY - 8, {
      size: 9,
      maxWidth: colWidths[1] - 8,
    });
    drawText(page, String(item.quantity), colStarts[2] + 4, rowY - 8, { size: 9 });
    drawText(
      page,
      formatCurrency(item.unitPrice, data.currency),
      colStarts[3] + 4,
      rowY - 8,
      { size: 9 },
    );
    drawText(
      page,
      formatCurrency(item.total, data.currency),
      colStarts[4] + 4,
      rowY - 8,
      { size: 9 },
    );

    y -= 20;
  }

  // Table bottom border
  page.drawLine({
    start: { x: MARGIN, y: y - 2 },
    end: { x: MARGIN + CONTENT_WIDTH, y: y - 2 },
    thickness: 0.5,
    color: GRAY,
  });

  y -= SECTION_GAP + 4;

  // ── Totals Section (right-aligned) ──
  ensureSpace(60);
  const totalsX = PAGE_WIDTH - MARGIN - 180;
  const valuesX = PAGE_WIDTH - MARGIN - 10;

  const drawTotalRow = (
    label: string,
    value: string,
    opts: { bold?: boolean; size?: number } = {},
  ) => {
    const { bold = false, size = 10 } = opts;
    drawText(page, label, totalsX, y, { size, color: GRAY });
    const valWidth = textWidth(value, size, bold);
    drawText(page, value, valuesX - valWidth, y, { size, bold, color: DARK });
    y -= LINE_HEIGHT + 2;
  };

  drawTotalRow(`${labels.subtotal}:`, formatCurrency(data.subtotal, data.currency));
  if (data.taxRate > 0) {
    drawTotalRow(
      `${labels.tax} (${data.taxRate}%):`,
      formatCurrency(data.taxAmount, data.currency),
    );
  }

  page.drawLine({
    start: { x: totalsX, y: y + 2 },
    end: { x: valuesX, y: y + 2 },
    thickness: 1,
    color: DARK,
  });
  y -= 14;

  drawTotalRow(`${labels.total}:`, formatCurrency(data.total, data.currency), {
    bold: true,
    size: 13,
  });

  y -= SECTION_GAP;

  // ── Amount in Words (transport) ──
  if (isTransport && data.amountInWords) {
    ensureSpace(30);
    drawText(page, `${labels.amountInWords}:`, MARGIN, y, {
      size: 10,
      bold: true,
      color: GRAY,
    });
    y -= LINE_HEIGHT + 2;
    drawText(page, data.amountInWords, MARGIN, y, { size: 10, color: DARK });
    y -= SECTION_GAP + 4;
  }

  // ── Bank Accounts ──
  if (data.companyBankAccounts) {
    ensureSpace(40);
    drawText(page, `${labels.paymentDetails}:`, MARGIN, y, {
      size: 10,
      bold: true,
      color: GRAY,
    });
    y -= LINE_HEIGHT + 2;
    y = drawMultiline(page, data.companyBankAccounts, MARGIN, y, {
      size: 9,
      color: DARK,
    });
    y -= SECTION_GAP + 4;
  }

  // ── Payment Terms ──
  if (data.paymentTerms) {
    ensureSpace(30);
    drawText(page, `${labels.paymentTerms}:`, MARGIN, y, {
      size: 10,
      bold: true,
      color: GRAY,
    });
    y -= LINE_HEIGHT + 2;
    y = drawMultiline(page, data.paymentTerms, MARGIN, y, {
      size: 9,
      color: DARK,
    });
    y -= SECTION_GAP + 4;
  }

  // ── Notes ──
  if (data.notes) {
    ensureSpace(30);
    drawText(page, `${labels.notes}:`, MARGIN, y, { size: 10, bold: true, color: GRAY });
    y -= LINE_HEIGHT + 2;
    y = drawMultiline(page, data.notes, MARGIN, y, { size: 9, color: DARK });
    y -= SECTION_GAP + 4;
  }

  // ── Signature & Stamp Section ──
  const hasSignature = !!data.signatureImageUrl;
  const hasStamp = !!data.stampImageUrl;

  if (hasSignature || hasStamp || (isTransport && data.directorName)) {
    const sigBlockX = PAGE_WIDTH - MARGIN - 220;
    const sigBlockWidth = 220;

    const stampImage = hasStamp ? await ctx.embedImage(data.stampImageUrl) : null;
    const sigImage = hasSignature ? await ctx.embedImage(data.signatureImageUrl) : null;

    const stampDims = stampImage ? stampImage.scaleToFit(150, 150) : null;
    const sigDims = sigImage ? sigImage.scaleToFit(140, 70) : null;

    const imageBlockHeight = Math.max(
      stampDims?.height ?? 0,
      sigDims?.height ?? 0,
      80,
    );

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
      thickness: 0.5,
      color: GRAY,
    });
    y -= LINE_HEIGHT;

    const signerDisplayName = data.signerName || (isTransport ? data.directorName : '');
    if (signerDisplayName) {
      const nameWidth = textWidth(signerDisplayName, 9, false);
      drawText(
        page,
        signerDisplayName,
        sigBlockX + (sigBlockWidth - nameWidth) / 2,
        y,
        { size: 9, color: DARK },
      );
      y -= LINE_HEIGHT;
    }

    if (isTransport && data.directorName) {
      const dirLabel = labels.directorName;
      const dirLabelWidth = textWidth(dirLabel, 8, false);
      drawText(
        page,
        dirLabel,
        sigBlockX + (sigBlockWidth - dirLabelWidth) / 2,
        y,
        { size: 8, color: GRAY },
      );
    }
  }
};
