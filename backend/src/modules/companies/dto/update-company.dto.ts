import { z } from 'zod';

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
});

export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>;
