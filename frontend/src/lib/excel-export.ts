import ExcelJS from 'exceljs';
import type { AnalyticsDocument } from '../types/index.ts';

/**
 * Export analytics documents to an Excel (.xlsx) file and trigger download.
 */
export async function exportAnalyticsToExcel(
  documents: AnalyticsDocument[],
  filename = 'analytics-export',
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Trasty Docs';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Documents');

  // Define columns
  sheet.columns = [
    { header: 'Document #', key: 'documentNumber', width: 20 },
    { header: 'Date', key: 'createdAt', width: 14 },
    { header: 'Company', key: 'companyName', width: 25 },
    { header: 'Buyer', key: 'buyerName', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Base Currency', key: 'baseCurrency', width: 14 },
    { header: 'Base Amount', key: 'baseCurrencyAmount', width: 15 },
    { header: 'Exchange Rate', key: 'exchangeRate', width: 14 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  // Add data rows
  for (const doc of documents) {
    sheet.addRow({
      documentNumber: doc.documentNumber || '-',
      createdAt: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-',
      companyName: doc.companyName || '-',
      buyerName: doc.buyerName || '-',
      status: doc.status,
      currency: doc.currency,
      amount: doc.amount,
      baseCurrency: doc.baseCurrency || '-',
      baseCurrencyAmount: doc.baseCurrencyAmount || 0,
      exchangeRate: doc.exchangeRate || 0,
    });
  }

  // Format number columns
  sheet.getColumn('amount').numFmt = '#,##0.00';
  sheet.getColumn('baseCurrencyAmount').numFmt = '#,##0.00';
  sheet.getColumn('exchangeRate').numFmt = '#,##0.0000';

  // Add summary row
  const lastDataRow = documents.length + 1;
  const summaryRow = sheet.addRow({
    documentNumber: 'TOTAL',
    createdAt: '',
    companyName: '',
    buyerName: '',
    status: `${documents.length} documents`,
    currency: '',
    amount: documents.reduce((sum, d) => sum + d.amount, 0),
    baseCurrency: '',
    baseCurrencyAmount: documents.reduce((sum, d) => sum + (d.baseCurrencyAmount || 0), 0),
    exchangeRate: '',
  });
  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };

  // Add borders to all cells
  for (let row = 1; row <= lastDataRow + 1; row++) {
    for (let col = 1; col <= 10; col++) {
      const cell = sheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    }
  }

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
