import { z } from 'zod';

export const CreateStampSchema = z.object({
  name: z.string().max(100).default('Company Stamp'),
  imageBase64: z.string().min(1, 'Stamp image is required'),
  isDefault: z.boolean().default(false),
});

export type CreateStampDto = z.infer<typeof CreateStampSchema>;
