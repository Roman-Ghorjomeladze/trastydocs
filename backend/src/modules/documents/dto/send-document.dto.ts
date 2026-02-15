import { z } from 'zod';

export const SendDocumentSchema = z.object({
  recipientEmail: z.string().email('Valid email is required'),
  message: z.string().max(1000).optional(),
});

export type SendDocumentDto = z.infer<typeof SendDocumentSchema>;
