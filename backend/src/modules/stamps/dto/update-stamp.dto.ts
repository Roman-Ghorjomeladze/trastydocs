import { z } from 'zod';

export const UpdateStampSchema = z.object({
  name: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateStampDto = z.infer<typeof UpdateStampSchema>;
