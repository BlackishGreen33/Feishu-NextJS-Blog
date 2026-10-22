import { z } from 'zod';

export const guestbookStatusSchema = z.enum(['deleted', 'hidden', 'published']);
export const guestbookMessageSchema = z.looseObject({
  createdAt: z.number(),
  id: z.string(),
  uid: z.string().optional(),
  name: z.string(),
  email: z.string(),
  image: z.string().optional(),
  message: z.string(),
  status: guestbookStatusSchema,
  updatedAt: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  deletedAt: z.number().nullable(),
  deleted_at: z.string().nullable(),
  is_show: z.boolean().optional(),
});
export const guestbookRecordSchema = guestbookMessageSchema.required({
  uid: true,
  image: true,
  is_show: true,
});
export const guestbookViewerSchema = z.looseObject({
  canModerate: z.boolean(),
  isAuthenticated: z.boolean(),
  uid: z.string().nullable(),
});
export const guestbookPageSchema = z.looseObject({
  configured: z.boolean(),
  hasMore: z.boolean(),
  messages: z.array(guestbookMessageSchema),
  nextCursor: z.string().nullable(),
  viewer: guestbookViewerSchema,
});
export const guestbookMutationSchema = z.looseObject({
  message: guestbookMessageSchema.nullable(),
  viewer: guestbookViewerSchema,
});
export const guestbookCursorSchema = z.object({
  created_at: z.string().min(1),
  id: z.string().min(1),
});
export const legacyGuestbookRecordSchema = z.record(z.string(), z.unknown());
export const guestbookCreateBodySchema = z.looseObject({
  message: z.unknown().optional(),
});
export const guestbookModerationBodySchema = z.looseObject({
  status: z.unknown().optional(),
});
export const guestbookMessageInputSchema = z
  .string({ error: 'INVALID_MESSAGE' })
  .trim()
  .min(1, { error: 'INVALID_MESSAGE' })
  // The existing limit counts UTF-16 code units, including two per astral emoji.
  .refine((value) => value.length <= 500, { error: 'MESSAGE_TOO_LONG' });
export const guestbookMessageIdSchema = z
  .string()
  .min(1)
  .refine(
    (id) => !['.', '#', '$', '[', ']', '/'].some((part) => id.includes(part)),
  );
