import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { InvoiceData } from '../types/index.ts';
import { formatCurrency } from './invoice-utils.ts';
import { getInvoiceLabels } from './invoice-i18n.ts';
import type { InvoiceLanguage } from './invoice-i18n.ts';

// ── Layout constants ──
const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 14;
const SECTION_GAP = 20;

// ── Colors ──
const BLUE = rgb(0.145, 0.388, 0.922); // #2563eb
const DARK = rgb(0.13, 0.13, 0.13);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
const WHITE = rgb(1, 1, 1);

// ── Font cache (module-level singleton) ──
// NotoSans covers Latin, Cyrillic, Greek (en, ru, tr)
// NotoSansGeorgian covers Georgian script only (ka)
// For Georgian invoices we load BOTH fonts and split text into segments

interface FontSet {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}

let fontCacheLatinCyrillic: FontSet | null = null;
let fontCacheGeorgian: FontSet | null = null;

async function fetchFontPair(
  regularPath: string,
  boldPath: string,
): Promise<FontSet> {
  const [regularRes, boldRes] = await Promise.all([
    fetch(regularPath),
    fetch(boldPath),
  ]);
  if (!regularRes.ok || !boldRes.ok) {
    throw new Error(`Failed to fetch font files: ${regularPath}`);
  }
  const [regular, bold] = await Promise.all([
    regularRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ]);
  return { regular, bold };
}

async function loadLatinCyrillicFonts(): Promise<FontSet> {
  if (fontCacheLatinCyrillic) return fontCacheLatinCyrillic;
  fontCacheLatinCyrillic = await fetchFontPair(
    '/fonts/NotoSans-Regular.ttf',
    '/fonts/NotoSans-Bold.ttf',
  );
  return fontCacheLatinCyrillic;
}

async function loadGeorgianFonts(): Promise<FontSet> {
  if (fontCacheGeorgian) return fontCacheGeorgian;
  fontCacheGeorgian = await fetchFontPair(
    '/fonts/NotoSansGeorgian-Regular.ttf',
    '/fonts/NotoSansGeorgian-Bold.ttf',
  );
  return fontCacheGeorgian;
}

// Georgian Unicode ranges:
// U+10A0–U+10FF — Mkhedruli (lowercase) + Asomtavruli (old uppercase)
// U+1C90–U+1CBF — Mtavruli (modern uppercase, produced by toUpperCase())
// U+2D00–U+2D2F — Nuskhuri supplement
const GEORGIAN_REGEX = /[\u10A0-\u10FF\u1C90-\u1CBF\u2D00-\u2D2F]/;


/**
 * Attempt to fetch an image URL and embed it in a PDFDocument.
 * Supports PNG and JPG by detecting magic bytes.
 * Returns null on failure (network error, unsupported format, etc.).
 */
async function embedImage(
  pdfDoc: PDFDocument,
  imageUrl: string,
): Promise<Awaited<ReturnType<typeof pdfDoc.embedPng>> | null> {
  if (!imageUrl) return null;
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Check magic bytes for PNG (89 50 4E 47) or JPG (FF D8 FF)
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      return await pdfDoc.embedPng(bytes);
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      return await pdfDoc.embedJpg(bytes);
    }

    // Try PNG as fallback
    return await pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

/**
 * Generate a professional invoice PDF from structured InvoiceData.
 * Uses pdf-lib with Noto Sans custom fonts for full Unicode support
 * (Latin, Cyrillic, Georgian, Turkish). Falls back to Helvetica if fonts fail to load.
 * Supports i18n labels, transport invoice sections, and signature/stamp embedding.
 */
export async function exportInvoicePdf(
  data: InvoiceData,
): Promise<Uint8Array> {
  const labels = getInvoiceLabels((data.language || 'en') as InvoiceLanguage);
  const isTransport = data.documentType === 'transport_invoice';

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load custom fonts that support Unicode (Georgian, Cyrillic, Turkish, etc.)
  // For Georgian: loads BOTH NotoSans (Latin/digits) + NotoSansGeorgian (Georgian script)
  // Falls back to Helvetica (Latin-only) if custom font fetch fails
  const isGeorgian = (data.language || 'en') === 'ka';
  let font: Awaited<ReturnType<typeof pdfDoc.embedFont>>;
  let fontBold: Awaited<ReturnType<typeof pdfDoc.embedFont>>;
  let fontGeo: Awaited<ReturnType<typeof pdfDoc.embedFont>> | null = null;
  let fontGeoBold: Awaited<ReturnType<typeof pdfDoc.embedFont>> | null = null;

  try {
    const latinBytes = await loadLatinCyrillicFonts();
    font = await pdfDoc.embedFont(new Uint8Array(latinBytes.regular), { subset: false });
    fontBold = await pdfDoc.embedFont(new Uint8Array(latinBytes.bold), { subset: false });

    if (isGeorgian) {
      const geoBytes = await loadGeorgianFonts();
      fontGeo = await pdfDoc.embedFont(new Uint8Array(geoBytes.regular), { subset: false });
      fontGeoBold = await pdfDoc.embedFont(new Uint8Array(geoBytes.bold), { subset: false });
    }
  } catch (err) {
    console.error('Failed to load Noto Sans fonts, falling back to Helvetica (Latin-only):', err);
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Helper: add new page when space runs out
  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 30) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // Helper: split text into segments by script (Georgian vs Latin/other)
  // Each segment is { text, isGeorgian } so we can draw with the right font
  type TextSegment = { text: string; isGeo: boolean };
  const splitByScript = (text: string): TextSegment[] => {
    if (!isGeorgian || !fontGeo) return [{ text, isGeo: false }];
    const segments: TextSegment[] = [];
    let current = '';
    let currentIsGeo = false;
    for (const char of text) {
      const charIsGeo = GEORGIAN_REGEX.test(char);
      if (current.length === 0) {
        current = char;
        currentIsGeo = charIsGeo;
      } else if (charIsGeo === currentIsGeo) {
        current += char;
      } else {
        segments.push({ text: current, isGeo: currentIsGeo });
        current = char;
        currentIsGeo = charIsGeo;
      }
    }
    if (current.length > 0) {
      segments.push({ text: current, isGeo: currentIsGeo });
    }
    return segments;
  };

  // Helper: compute width of text across possibly multiple fonts
  const textWidth = (text: string, size: number, bold: boolean): number => {
    if (!isGeorgian || !fontGeo) {
      const f = bold ? fontBold : font;
      return f.widthOfTextAtSize(text, size);
    }
    const segments = splitByScript(text);
    let width = 0;
    for (const seg of segments) {
      const f = seg.isGeo
        ? (bold ? fontGeoBold! : fontGeo!)
        : (bold ? fontBold : font);
      width += f.widthOfTextAtSize(seg.text, size);
    }
    return width;
  };

  // Helper: draw text (handles mixed Georgian + Latin by drawing segments)
  const drawText = (
    text: string,
    x: number,
    yPos: number,
    opts: {
      size?: number;
      color?: ReturnType<typeof rgb>;
      bold?: boolean;
      maxWidth?: number;
    } = {},
  ) => {
    const { size = 10, color = DARK, bold = false, maxWidth } = opts;
    let displayText = text;

    // Truncate if too wide
    if (maxWidth) {
      while (textWidth(displayText, size, bold) > maxWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
    }

    // For non-Georgian or when Georgian fonts aren't loaded, draw normally
    if (!isGeorgian || !fontGeo) {
      const f = bold ? fontBold : font;
      page.drawText(displayText, { x, y: yPos, size, font: f, color });
      return;
    }

    // For Georgian: draw each segment with the appropriate font
    const segments = splitByScript(displayText);
    let curX = x;
    for (const seg of segments) {
      const f = seg.isGeo
        ? (bold ? fontGeoBold! : fontGeo!)
        : (bold ? fontBold : font);
      page.drawText(seg.text, { x: curX, y: yPos, size, font: f, color });
      curX += f.widthOfTextAtSize(seg.text, size);
    }
  };

  // Helper: draw multiline text, returns new Y position
  const drawMultiline = (
    text: string,
    x: number,
    yPos: number,
    opts: {
      size?: number;
      color?: ReturnType<typeof rgb>;
      bold?: boolean;
      lineHeight?: number;
    } = {},
  ): number => {
    const { size = 10, color = DARK, bold = false, lineHeight = LINE_HEIGHT } = opts;
    const lines = text.split('\n').filter((l) => l.trim() !== '');
    let currentY = yPos;
    for (const line of lines) {
      ensureSpace(lineHeight);
      drawText(line, x, currentY, { size, color, bold });
      currentY -= lineHeight;
    }
    return currentY;
  };

  // ── Company Name (top left, large) ──
  drawText(data.companyName || 'Company', MARGIN, y, {
    size: 18,
    bold: true,
    color: DARK,
  });

  // ── INVOICE / TRANSPORT INVOICE title (top right, blue) ──
  const invoiceTitle = isTransport
    ? labels.transportInvoice.toUpperCase()
    : labels.invoice.toUpperCase();
  const titleWidth = textWidth(invoiceTitle, 24, true);
  drawText(invoiceTitle, PAGE_WIDTH - MARGIN - titleWidth, y, {
    size: 24,
    bold: true,
    color: BLUE,
  });

  y -= 24;

  // ── Company details (left) ──
  const companyDetails = [
    data.companyAddress,
    data.companyPhone ? `${labels.phone}: ${data.companyPhone}` : '',
    data.companyEmail ? `${labels.email}: ${data.companyEmail}` : '',
    data.companyTaxId ? `${labels.taxId}: ${data.companyTaxId}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const companyEndY = drawMultiline(companyDetails, MARGIN, y, {
    size: 9,
    color: GRAY,
  });

  // ── Invoice details (right) ──
  const rightX = PAGE_WIDTH - MARGIN - 150;
  const detailsLines = [
    data.invoiceNumber ? `${labels.invoiceNumber}: ${data.invoiceNumber}` : '',
    data.invoiceDate ? `${labels.invoiceDate}: ${data.invoiceDate}` : '',
    data.dueDate ? `${labels.dueDate}: ${data.dueDate}` : '',
  ].filter(Boolean);

  let detailY = y;
  for (const line of detailsLines) {
    drawText(line, rightX, detailY, { size: 9, color: GRAY });
    detailY -= LINE_HEIGHT;
  }

  y = Math.min(companyEndY, detailY) - SECTION_GAP;

  // ── Bill To section ──
  ensureSpace(80);
  drawText(`${labels.billTo}:`, MARGIN, y, { size: 10, bold: true, color: GRAY });
  y -= LINE_HEIGHT + 2;

  drawText(data.buyerName || '-', MARGIN, y, { size: 11, bold: true });
  y -= LINE_HEIGHT;

  const buyerDetails = [
    data.buyerAddress,
    data.buyerPhone ? `${labels.phone}: ${data.buyerPhone}` : '',
    data.buyerEmail ? `${labels.email}: ${data.buyerEmail}` : '',
    data.buyerTaxId ? `${labels.taxId}: ${data.buyerTaxId}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  y = drawMultiline(buyerDetails, MARGIN, y, { size: 9, color: GRAY });
  y -= SECTION_GAP;

  // ── Transport Info Section (only for transport invoices) ──
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

      drawText(`${labels.transportInfo}:`, MARGIN, y, {
        size: 10,
        bold: true,
        color: GRAY,
      });
      y -= LINE_HEIGHT + 2;

      // Draw transport info box
      const boxHeight = transportLines.length * LINE_HEIGHT + 10;
      page.drawRectangle({
        x: MARGIN,
        y: y - boxHeight + 8,
        width: CONTENT_WIDTH,
        height: boxHeight,
        color: rgb(0.96, 0.97, 1), // light blue background
        borderColor: rgb(0.85, 0.88, 0.95),
        borderWidth: 0.5,
      });

      for (const line of transportLines) {
        drawText(line, MARGIN + 8, y, { size: 9, color: DARK });
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

  // Table header
  const headerHeight = 22;
  page.drawRectangle({
    x: MARGIN,
    y: y - headerHeight + 4,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: BLUE,
  });

  const headers = ['#', labels.description, labels.quantity, labels.unitPrice, labels.total];
  for (let i = 0; i < headers.length; i++) {
    drawText(headers[i], colStarts[i] + 4, y - 10, {
      size: 8,
      bold: true,
      color: WHITE,
    });
  }

  y -= headerHeight + 2;

  // Table rows
  for (let idx = 0; idx < data.items.length; idx++) {
    ensureSpace(20);
    const item = data.items[idx];
    const rowY = y;

    // Alternating background
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: rowY - 12,
        width: CONTENT_WIDTH,
        height: 18,
        color: LIGHT_GRAY,
      });
    }

    drawText(String(idx + 1), colStarts[0] + 4, rowY - 6, { size: 9 });
    drawText(item.description || '', colStarts[1] + 4, rowY - 6, {
      size: 9,
      maxWidth: colWidths[1] - 8,
    });
    drawText(String(item.quantity), colStarts[2] + 4, rowY - 6, { size: 9 });
    drawText(
      formatCurrency(item.unitPrice, data.currency),
      colStarts[3] + 4,
      rowY - 6,
      { size: 9 },
    );
    drawText(
      formatCurrency(item.total, data.currency),
      colStarts[4] + 4,
      rowY - 6,
      { size: 9 },
    );

    y -= 18;
  }

  // Table bottom border
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 0.5,
    color: GRAY,
  });

  y -= SECTION_GAP;

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
    drawText(label, totalsX, y, { size, color: GRAY });
    const valWidth = textWidth(value, size, bold);
    drawText(value, valuesX - valWidth, y, { size, bold, color: DARK });
    y -= LINE_HEIGHT + 2;
  };

  drawTotalRow(`${labels.subtotal}:`, formatCurrency(data.subtotal, data.currency));
  if (data.taxRate > 0) {
    drawTotalRow(
      `${labels.tax} (${data.taxRate}%):`,
      formatCurrency(data.taxAmount, data.currency),
    );
  }

  // Divider before total
  page.drawLine({
    start: { x: totalsX, y: y + 4 },
    end: { x: valuesX, y: y + 4 },
    thickness: 1,
    color: DARK,
  });
  y -= 12;

  drawTotalRow(`${labels.total}:`, formatCurrency(data.total, data.currency), {
    bold: true,
    size: 13,
  });

  y -= SECTION_GAP;

  // ── Amount in Words (transport invoices) ──
  if (isTransport && data.amountInWords) {
    ensureSpace(30);
    drawText(`${labels.amountInWords}:`, MARGIN, y, {
      size: 10,
      bold: true,
      color: GRAY,
    });
    y -= LINE_HEIGHT;
    drawText(data.amountInWords, MARGIN, y, { size: 10, color: DARK });
    y -= SECTION_GAP;
  }

  // ── Bank Accounts ──
  if (data.companyBankAccounts) {
    ensureSpace(40);
    drawText(`${labels.paymentDetails}:`, MARGIN, y, {
      size: 10,
      bold: true,
      color: GRAY,
    });
    y -= LINE_HEIGHT;
    y = drawMultiline(data.companyBankAccounts, MARGIN, y, {
      size: 9,
      color: DARK,
    });
    y -= SECTION_GAP;
  }

  // ── Payment Terms ──
  if (data.paymentTerms) {
    ensureSpace(30);
    drawText(`${labels.paymentTerms}:`, MARGIN, y, {
      size: 10,
      bold: true,
      color: GRAY,
    });
    y -= LINE_HEIGHT;
    y = drawMultiline(data.paymentTerms, MARGIN, y, {
      size: 9,
      color: DARK,
    });
    y -= SECTION_GAP;
  }

  // ── Notes ──
  if (data.notes) {
    ensureSpace(30);
    drawText(`${labels.notes}:`, MARGIN, y, { size: 10, bold: true, color: GRAY });
    y -= LINE_HEIGHT;
    y = drawMultiline(data.notes, MARGIN, y, { size: 9, color: DARK });
    y -= SECTION_GAP;
  }

  // ── Signature & Stamp Section ──
  const hasSignature = !!data.signatureImageUrl;
  const hasStamp = !!data.stampImageUrl;

  if (hasSignature || hasStamp || (isTransport && data.directorName)) {
    ensureSpace(160);

    const sigBlockX = PAGE_WIDTH - MARGIN - 220;
    const sigBlockWidth = 220;

    // Pre-load images to calculate layout
    const stampImage = hasStamp ? await embedImage(pdfDoc, data.stampImageUrl) : null;
    const sigImage = hasSignature ? await embedImage(pdfDoc, data.signatureImageUrl) : null;

    // Scale images: stamp larger (circular/rectangular seal), signature fits inside
    const stampDims = stampImage ? stampImage.scaleToFit(150, 150) : null;
    const sigDims = sigImage ? sigImage.scaleToFit(140, 70) : null;

    // Block height accommodates the larger of the two images
    const imageBlockHeight = Math.max(
      stampDims?.height ?? 0,
      sigDims?.height ?? 0,
      80,
    );

    const imageCenterY = y - imageBlockHeight / 2;

    // Draw SIGNATURE first (bottom layer)
    if (sigImage && sigDims) {
      page.drawImage(sigImage, {
        x: sigBlockX + (sigBlockWidth - sigDims.width) / 2,
        y: imageCenterY - sigDims.height / 2,
        width: sigDims.width,
        height: sigDims.height,
      });
    }

    // Draw STAMP on top — the stamp image has a transparent background
    // (processed during upload via removeWhiteBackground), so the
    // signature underneath remains visible through transparent areas
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

    // Signature line
    page.drawLine({
      start: { x: sigBlockX + 10, y },
      end: { x: sigBlockX + sigBlockWidth - 10, y },
      thickness: 0.5,
      color: GRAY,
    });
    y -= LINE_HEIGHT;

    // Signer name or director name
    const signerDisplayName = data.signerName || (isTransport ? data.directorName : '');
    if (signerDisplayName) {
      const nameWidth = textWidth(signerDisplayName, 9, false);
      drawText(
        signerDisplayName,
        sigBlockX + (sigBlockWidth - nameWidth) / 2,
        y,
        { size: 9, color: DARK },
      );
      y -= LINE_HEIGHT;
    }

    // Director label for transport invoices
    if (isTransport && data.directorName) {
      const dirLabel = labels.directorName;
      const dirLabelWidth = textWidth(dirLabel, 8, false);
      drawText(
        dirLabel,
        sigBlockX + (sigBlockWidth - dirLabelWidth) / 2,
        y,
        { size: 8, color: GRAY },
      );
    }
  }

  return pdfDoc.save();
}

