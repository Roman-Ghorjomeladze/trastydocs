import { z } from 'zod';

export const UpdateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  inputData: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z
    .enum([
      'DRAFT',
      'PENDING_SIGNATURE',
      'SIGNED',
      'SENT',
      'VIEWED',
      'COMPLETED',
      'PAID',
      'OVERDUE',
      'CANCELLED',
      'ARCHIVED',
    ])
    .optional(),
  buyerId: z.string().nullable().optional(),
  sellerId: z.string().nullable().optional(),
});

export type UpdateDocumentDto = z.infer<typeof UpdateDocumentSchema>;
