import { z } from 'zod';

const BankAccountSchema = z.object({
  name: z.string().min(1, 'Bank account name is required').max(100),
  accountNumber: z.string().min(1, 'Account number is required').max(100),
});

export const UpdateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  taxId: z.string().max(100).nullable().optional(),
  bankAccounts: z.array(BankAccountSchema).max(10).nullable().optional(),
  contactPerson: z.string().max(255).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type UpdateContactDto = z.infer<typeof UpdateContactSchema>;
