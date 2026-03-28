import { z } from 'zod';

// Max 15MB base64 (base64 inflates ~33%, so 15MB binary ≈ 20MB base64)
const MAX_PDF_BASE64_LENGTH = 20 * 1024 * 1024;

export const UploadPdfSchema = z.object({
  pdfBase64: z
    .string()
    .min(1, 'PDF data is required')
    .max(MAX_PDF_BASE64_LENGTH, 'PDF exceeds maximum size of 15MB')
    .refine(
      (val) => {
        try {
          // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
          const buf = Buffer.from(val.slice(0, 8), 'base64');
          return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
        } catch {
          return false;
        }
      },
      { message: 'File must be a valid PDF' },
    ),
});

export type UploadPdfDto = z.infer<typeof UploadPdfSchema>;
