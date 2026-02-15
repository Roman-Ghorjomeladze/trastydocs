import { z } from 'zod';

export const CreateDocumentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  documentNumber: z.string().max(50).optional(),
  buyerId: z.string().optional(),
  sellerId: z.string().optional(),
  inputData: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(2000).optional(),
});

export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;
