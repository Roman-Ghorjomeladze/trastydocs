import { z } from 'zod';

export const UpdateSignatureSchema = z.object({
  name: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateSignatureDto = z.infer<typeof UpdateSignatureSchema>;
