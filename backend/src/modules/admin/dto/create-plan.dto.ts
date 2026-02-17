import { z } from 'zod/v4';

const LimitsSchema = z.object({
  maxCompanies: z.number().int().min(-1),
  maxContractors: z.number().int().min(-1),
  maxDocuments: z.number().int().min(-1),
  maxSignaturesPerCompany: z.number().int().min(-1),
  maxStampsPerCompany: z.number().int().min(-1),
});

export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(255),
  price: z.number().min(0),
  paddlePriceId: z.string().max(255).optional().nullable(),
  limits: LimitsSchema,
  sortOrder: z.number().int().min(0).optional(),
});

export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;
