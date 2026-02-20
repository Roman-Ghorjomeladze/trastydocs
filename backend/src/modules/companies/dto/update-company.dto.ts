import { z } from 'zod';

const IntermediaryBankAccountSchema = z.object({
  id: z.string(),
  bankName: z.string().min(1).max(255),
  accountNumber: z.string().min(1).max(100),
  currency: z.string().min(2).max(5).default('GEL'),
  swiftCode: z.string().max(11).default(''),
  beneficiaryName: z.string().max(255).default(''),
});

const BankAccountSchema = z.object({
  id: z.string(),
  bankName: z.string().min(1).max(255),
  accountNumber: z.string().min(1).max(100),
  currency: z.string().min(2).max(5).default('GEL'),
  swiftCode: z.string().max(11).default(''),
  beneficiaryName: z.string().max(255).default(''),
  isDefault: z.boolean().default(false),
  intermediaryBanks: z.array(IntermediaryBankAccountSchema).default([]),
});

const TranslationsSchema = z.record(z.string(), z.string().max(500)).optional();

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
  bankAccounts: z.array(BankAccountSchema).optional(),
  nameTranslations: TranslationsSchema,
  addressTranslations: TranslationsSchema,
  baseCurrency: z.string().min(2).max(5).optional(),
});

export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>;
