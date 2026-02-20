import { z } from 'zod';

const BankAccountSchema = z.object({
  id: z.string(),
  bankName: z.string().min(1).max(255),
  accountNumber: z.string().min(1).max(100),
  currency: z.string().min(2).max(5).default('GEL'),
  isDefault: z.boolean().default(false),
});

const TranslationsSchema = z.record(z.string(), z.string().max(500)).optional();

export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(100).optional(),
  bankAccounts: z.array(BankAccountSchema).optional(),
  nameTranslations: TranslationsSchema,
  addressTranslations: TranslationsSchema,
});

export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;
