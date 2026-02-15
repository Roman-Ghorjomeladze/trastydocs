import { z } from 'zod';

export const UploadPdfSchema = z.object({
  pdfBase64: z.string().min(1, 'PDF data is required'),
});

export type UploadPdfDto = z.infer<typeof UploadPdfSchema>;
