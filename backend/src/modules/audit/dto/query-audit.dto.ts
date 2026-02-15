import { z } from 'zod';

export const QueryAuditSchema = z.object({
  action: z
    .enum([
      'CREATE',
      'UPDATE',
      'DELETE',
      'VIEW',
      'EXPORT',
      'DUPLICATE',
      'SIGN',
      'SEND',
      'LOGIN',
      'LOGOUT',
    ])
    .optional(),
  entity: z.string().optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryAuditDto = z.infer<typeof QueryAuditSchema>;
