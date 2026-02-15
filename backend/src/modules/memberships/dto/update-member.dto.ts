import { z } from 'zod';

export const UpdateMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).optional(),
});

export type UpdateMemberDto = z.infer<typeof UpdateMemberSchema>;
