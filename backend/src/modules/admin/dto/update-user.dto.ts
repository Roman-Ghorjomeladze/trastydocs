import { z } from 'zod/v4';

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const ToggleAdminSchema = z.object({
  isAdmin: z.boolean(),
});

export type ToggleAdminDto = z.infer<typeof ToggleAdminSchema>;
