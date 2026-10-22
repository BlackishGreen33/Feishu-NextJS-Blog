import { z } from 'zod';

export const legacyCommentSchema = z.looseObject({
  id_code: z.string(),
  created_at: z.string(),
  body_html: z.string(),
  user: z.looseObject({ name: z.string(), profile_image_90: z.string() }),
  get children() {
    return z.array(legacyCommentSchema).optional();
  },
});
export const commentResponseSchema = z.union([
  z.looseObject({
    status: z.literal(true),
    data: z.array(legacyCommentSchema),
  }),
  z.looseObject({ status: z.literal(false), error: z.unknown().optional() }),
]);
// Preserve Pages Router's existing String coercion for a scalar, array or absent id.
export const commentQuerySchema = z.object({
  post_id: z.unknown().transform(String),
});
