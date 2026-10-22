import { z } from 'zod';

export const projectSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  image: z.string(),
  link_demo: z.string().optional(),
  link_github: z.string().optional(),
  stacks: z.string(),
  content: z.string().optional(),
  is_show: z.boolean(),
  is_featured: z.boolean(),
  updated_at: z.string(),
});
export const projectRecordSchema = z.record(z.string(), z.unknown());
const stackNamesSchema = z.array(z.string());

export const parseProjectStacks = (value: string): string[] => {
  try {
    const parsed = stackNamesSchema.safeParse(JSON.parse(value) as unknown);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
};
