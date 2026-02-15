import { z } from 'zod';

export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(100).optional(),
});

export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;
