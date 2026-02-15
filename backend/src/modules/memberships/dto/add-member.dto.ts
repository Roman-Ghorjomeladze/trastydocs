import { z } from 'zod';

export const AddMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export type AddMemberDto = z.infer<typeof AddMemberSchema>;
