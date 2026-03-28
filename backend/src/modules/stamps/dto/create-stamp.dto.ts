import { z } from 'zod';

// Max 5MB base64 (base64 inflates ~33%, so 5MB binary ≈ 6.67MB base64)
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;

export const CreateStampSchema = z.object({
  name: z.string().max(100).default('Company Stamp'),
  imageBase64: z
    .string()
    .min(1, 'Stamp image is required')
    .max(MAX_BASE64_LENGTH, 'Stamp image exceeds maximum size of 5MB')
    .refine(
      (val) => {
        try {
          const buf = Buffer.from(val.slice(0, 16), 'base64');
          const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
          const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
          const isWebp = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
          return isPng || isJpeg || isWebp;
        } catch {
          return false;
        }
      },
      { message: 'Stamp image must be a valid PNG, JPEG, or WebP file' },
    ),
  isDefault: z.boolean().default(false),
});

export type CreateStampDto = z.infer<typeof CreateStampSchema>;
