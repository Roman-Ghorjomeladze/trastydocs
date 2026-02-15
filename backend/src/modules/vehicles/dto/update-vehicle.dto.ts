import { z } from 'zod';

export const UpdateVehicleSchema = z.object({
  model: z.string().min(1).max(100).optional(),
  licensePlate: z.string().min(1).max(20).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateVehicleDto = z.infer<typeof UpdateVehicleSchema>;
