import { z } from 'zod';

export const CreateSignatureSchema = z.object({
  name: z.string().max(100).default('My Signature'),
  imageBase64: z.string().min(1, 'Signature image is required'),
  isDefault: z.boolean().default(false),
});

export type CreateSignatureDto = z.infer<typeof CreateSignatureSchema>;
