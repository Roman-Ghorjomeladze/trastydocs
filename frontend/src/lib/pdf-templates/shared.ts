import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { PDFPage, PDFFont, Color } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { InvoiceData } from '../../types/index.ts';
import type { InvoiceLabels } from '../invoice-i18n.ts';
import { getInvoiceLabels } from '../invoice-i18n.ts';
import type { InvoiceLanguage } from '../invoice-i18n.ts';
import apiClient from '../../api/client.ts';

// ── Default layout constants (templates may use their own) ──
export const PAGE_WIDTH = 595.28; // A4 in points
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 50;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
export const LINE_HEIGHT = 14;
export const SECTION_GAP = 20;

/** Truncate company name to MAX_CHARS (adds "..." if cropped). Used by all templates. */
const MAX_COMPANY_NAME_CHARS = 80;
export function clampCompanyName(raw: string | undefined): string {
  const name = raw || 'Company';
  if (name.length <= MAX_COMPANY_NAME_CHARS) return name;
  return name.slice(0, MAX_COMPANY_NAME_CHARS - 3).trimEnd() + '...';
}

// ── Georgian Unicode ranges ──
const GEORGIAN_REGEX = /[\u10A0-\u10FF\u1C90-\u1CBF\u2D00-\u2D2F]/;

// ── Font cache (module-level singleton) ──
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

// ── Text segment for mixed-script rendering ──
export type TextSegment = { text: string; isGeo: boolean };

// ── Template context: everything a template render function needs ──
export interface TemplateContext {
  pdfDoc: PDFDocument;
  data: InvoiceData;
  labels: InvoiceLabels;
  isTransport: boolean;
  isGeorgian: boolean;

  // Fonts
  font: PDFFont;
  fontBold: PDFFont;
  fontGeo: PDFFont | null;
  fontGeoBold: PDFFont | null;

  // Drawing helpers (Georgian-aware)
  drawText: (
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    opts?: { size?: number; color?: Color; bold?: boolean; maxWidth?: number },
  ) => void;
  drawMultiline: (
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    opts?: { size?: number; color?: Color; bold?: boolean; lineHeight?: number },
  ) => number;
  textWidth: (text: string, size: number, bold: boolean) => number;
  splitByScript: (text: string) => TextSegment[];

  // Image embedding
  embedImage: (imageUrl: string) => Promise<Awaited<ReturnType<typeof PDFDocument.prototype.embedPng>> | null>;

  // Page management
  addPage: (width?: number, height?: number) => PDFPage;
}

export type TemplateRenderFn = (ctx: TemplateContext) => Promise<void>;

// ── Image embedding helper ──
async function embedImageInDoc(
  pdfDoc: PDFDocument,
  imageUrl: string,
): Promise<Awaited<ReturnType<typeof pdfDoc.embedPng>> | null> {
  if (!imageUrl) return null;
  try {
    let arrayBuffer: ArrayBuffer;

    if (imageUrl.startsWith('s3://')) {
      // S3 URL → resolve to presigned URL via backend, then fetch directly
      const res = await apiClient.get('/files/resolve', { params: { url: imageUrl } });
      const presignedUrl: string = res.data.url;
      const response = await fetch(presignedUrl);
      arrayBuffer = await response.arrayBuffer();
    } else if (imageUrl.startsWith('/api/') || imageUrl.startsWith('api/') || imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
      // Local file — fetch via authenticated proxy
      let apiPath = imageUrl;
      if (apiPath.startsWith('/api/')) apiPath = apiPath.slice(4);
      if (apiPath.startsWith('/uploads/')) apiPath = '/files' + apiPath.slice(8);
      if (apiPath.startsWith('uploads/')) apiPath = '/files/' + apiPath.slice(8);
      if (!apiPath.startsWith('/')) apiPath = '/' + apiPath;
      const response = await apiClient.get(apiPath, { responseType: 'arraybuffer' });
      arrayBuffer = response.data;
    } else if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:') || imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl);
      arrayBuffer = await response.arrayBuffer();
    } else {
      const response = await fetch(imageUrl);
      arrayBuffer = await response.arrayBuffer();
    }

    const bytes = new Uint8Array(arrayBuffer);

    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      return await pdfDoc.embedPng(bytes);
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      return await pdfDoc.embedJpg(bytes);
    }

    return await pdfDoc.embedPng(bytes);
  } catch (err) {
    console.error('Failed to embed image in PDF:', imageUrl, err);
    return null;
  }
}

// ── Factory: create a fully-initialized TemplateContext ──
export async function createTemplateContext(
  data: InvoiceData,
): Promise<TemplateContext> {
  const labels = getInvoiceLabels((data.language || 'en') as InvoiceLanguage);
  const isTransport = data.documentType === 'transport_invoice';

  // Check if any text content contains Georgian characters (not just the language setting)
  const allTextContent = [
    data.companyName, data.companyAddress, data.companyPhone, data.companyEmail,
    data.buyerName, data.buyerAddress, data.buyerPhone, data.buyerEmail,
    data.signerName, data.directorName, data.transportRoute,
    data.serviceDescription, data.amountInWords, data.notes, data.paymentTerms,
    ...(data.items?.map(i => i.description) || []),
  ].filter(Boolean).join('');
  const hasGeorgianContent = GEORGIAN_REGEX.test(allTextContent);
  const isGeorgian = (data.language || 'en') === 'ka' || hasGeorgianContent;

  console.log('[PDF Debug] language:', data.language);
  console.log('[PDF Debug] buyerName:', data.buyerName);
  console.log('[PDF Debug] buyerAddress:', data.buyerAddress);
  console.log('[PDF Debug] companyName:', data.companyName);
  console.log('[PDF Debug] hasGeorgianContent:', hasGeorgianContent);
  console.log('[PDF Debug] isGeorgian:', isGeorgian);
  console.log('[PDF Debug] signatureImageUrl:', data.signatureImageUrl);
  console.log('[PDF Debug] stampImageUrl:', data.stampImageUrl);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let font: PDFFont;
  let fontBold: PDFFont;
  let fontGeo: PDFFont | null = null;
  let fontGeoBold: PDFFont | null = null;

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
    console.error('Failed to load Noto Sans fonts, falling back to Helvetica:', err);
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  // Split text into segments by script (Georgian vs Latin/other)
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

  // Compute width of text across possibly multiple fonts
  const textWidthFn = (text: string, size: number, bold: boolean): number => {
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

  // Draw text (handles mixed Georgian + Latin)
  const drawTextFn = (
    page: PDFPage,
    text: string,
    x: number,
    yPos: number,
    opts: {
      size?: number;
      color?: Color;
      bold?: boolean;
      maxWidth?: number;
    } = {},
  ) => {
    const { size = 10, color = rgb(0.13, 0.13, 0.13), bold = false, maxWidth } = opts;
    let displayText = text;

    if (maxWidth) {
      while (textWidthFn(displayText, size, bold) > maxWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
    }

    if (!isGeorgian || !fontGeo) {
      const f = bold ? fontBold : font;
      page.drawText(displayText, { x, y: yPos, size, font: f, color });
      return;
    }

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

  // Draw multiline text, returns new Y position
  const drawMultilineFn = (
    page: PDFPage,
    text: string,
    x: number,
    yPos: number,
    opts: {
      size?: number;
      color?: Color;
      bold?: boolean;
      lineHeight?: number;
    } = {},
  ): number => {
    const { size = 10, color = rgb(0.13, 0.13, 0.13), bold = false, lineHeight = LINE_HEIGHT } = opts;
    const lines = text.split('\n').filter((l) => l.trim() !== '');
    let currentY = yPos;
    for (const line of lines) {
      drawTextFn(page, line, x, currentY, { size, color, bold });
      currentY -= lineHeight;
    }
    return currentY;
  };

  return {
    pdfDoc,
    data,
    labels,
    isTransport,
    isGeorgian,
    font,
    fontBold,
    fontGeo,
    fontGeoBold,
    drawText: drawTextFn,
    drawMultiline: drawMultilineFn,
    textWidth: textWidthFn,
    splitByScript,
    embedImage: (imageUrl: string) => embedImageInDoc(pdfDoc, imageUrl),
    addPage: (width = PAGE_WIDTH, height = PAGE_HEIGHT) => pdfDoc.addPage([width, height]),
  };
}
