import { z } from 'zod';

export const CreateCompanySignatureSchema = z.object({
  name: z.string().max(100).default('Company Signature'),
  imageBase64: z.string().min(1, 'Signature image is required'),
  isDefault: z.boolean().default(false),
});

export type CreateCompanySignatureDto = z.infer<typeof CreateCompanySignatureSchema>;
