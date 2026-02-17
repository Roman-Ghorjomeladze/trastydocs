import { z } from 'zod/v4';

const LimitsSchema = z.object({
  maxCompanies: z.number().int().min(-1),
  maxContractors: z.number().int().min(-1),
  maxDocuments: z.number().int().min(-1),
  maxSignaturesPerCompany: z.number().int().min(-1),
  maxStampsPerCompany: z.number().int().min(-1),
});

export const UpdatePlanSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  price: z.number().min(0).optional(),
  paddlePriceId: z.string().max(255).optional().nullable(),
  limits: LimitsSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePlanDto = z.infer<typeof UpdatePlanSchema>;
