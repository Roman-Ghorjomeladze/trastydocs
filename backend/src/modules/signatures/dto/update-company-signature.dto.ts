import { z } from 'zod';

export const UpdateCompanySignatureSchema = z.object({
  name: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateCompanySignatureDto = z.infer<typeof UpdateCompanySignatureSchema>;
