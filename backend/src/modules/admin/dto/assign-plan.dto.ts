import { z } from 'zod/v4';

export const AssignPlanSchema = z.object({
  planId: z.string().min(1),
});

export type AssignPlanDto = z.infer<typeof AssignPlanSchema>;
