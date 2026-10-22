import { z } from 'zod';

export const learnCategorySchema = z
  .string()
  .min(1)
  .refine(
    (value) => value !== '.' && value !== '..' && !/[\\/\0]/.test(value),
    'Expected one content category segment',
  );
const date = z.union([
  z.string(),
  z.date().transform((value) => value.toISOString()),
]);
export const lessonMetaSchema = z.looseObject({
  id: z.number(),
  title: z.string(),
  category: z.string(),
  chapter_id: z.number().optional(),
  chapter_title: z.string().optional(),
  language: z.string().optional(),
  difficulty: z.string().optional(),
  source: z.string().optional(),
  cover_url: z.string().optional(),
  source_url: z.string().optional(),
  created_at: date,
  updated_at: date,
  is_playground: z.boolean().default(false),
  is_comment: z.boolean().default(false),
  initial_code: z.string().optional(),
});
export const contentListSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      parent_slug: z.string(),
      slug: z.string(),
      title: z.string(),
    }),
  ),
});
export const lessonCountSchema = z.object({ count: z.number() });
