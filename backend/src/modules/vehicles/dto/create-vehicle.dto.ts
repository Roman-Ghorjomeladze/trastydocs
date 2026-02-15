import { z } from 'zod';

export const CreateVehicleSchema = z.object({
  model: z.string().min(1, 'Model is required').max(100),
  licensePlate: z.string().min(1, 'License plate is required').max(20),
  type: z.enum(['TRUCK', 'TRAILER']),
  notes: z.string().max(500).optional(),
});

export type CreateVehicleDto = z.infer<typeof CreateVehicleSchema>;
