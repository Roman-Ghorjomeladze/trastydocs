import { z } from 'zod';

const BankAccountSchema = z.object({
  name: z.string().min(1, 'Bank account name is required').max(100),
  accountNumber: z.string().min(1, 'Account number is required').max(100),
});

const TranslationsSchema = z.record(z.string(), z.string().max(500)).optional();

export const CreateContractorSchema = z.object({
  name: z.string().min(1, 'Contractor name is required').max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(100).optional(),
  bankAccounts: z.array(BankAccountSchema).max(10).optional(),
  contactPerson: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  nameTranslations: TranslationsSchema,
  addressTranslations: TranslationsSchema,
});

export type CreateContractorDto = z.infer<typeof CreateContractorSchema>;
