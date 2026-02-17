import { z } from 'zod/v4';

export const GrantCreditsSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().max(500).optional(),
});

export type GrantCreditsDto = z.infer<typeof GrantCreditsSchema>;
