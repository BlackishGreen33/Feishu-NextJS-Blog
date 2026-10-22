import { z } from 'zod';

const queryValue = z.union([z.string(), z.array(z.string())]).optional();
export const articleQuerySchema = z.looseObject({
  page: queryValue,
  per_page: queryValue,
  search: queryValue,
  tag: queryValue,
  featured: queryValue,
  featured_limit: queryValue,
});

export const articleFrontmatterSchema = z.object({
  slug: z.string().optional(),
  title: z.string().optional(),
  date: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  summary: z.string().optional(),
  cover: z.string().optional(),
  featured: z.boolean().optional(),
  draft: z.boolean().optional(),
  hide: z.boolean().optional(),
});

// Persisted artifacts may contain fields from older or newer sync versions.
// Validate consumed fields without stripping extra data or tightening dates/URLs.
export const articleTagSchema = z.looseObject({
  name: z.string(),
  slug: z.string(),
});

export const articleSummarySchema = z.looseObject({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  matchedExcerpt: z.string().optional(),
  cover: z.string().nullable(),
  publishedAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(articleTagSchema),
  featured: z.boolean(),
  draft: z.boolean(),
  readingTimeMinutes: z.number(),
  sourceNodeToken: z.string(),
  sourceDocumentId: z.string(),
});

export const articleSchema = articleSummarySchema.extend({
  content: z.string(),
  contentFormat: z.literal('markdown'),
});

export const articleSlugRedirectSchema = z.looseObject({
  sourceNodeToken: z.string(),
  targetSlug: z.string(),
});

export const articleIndexSchema = z.looseObject({
  generatedAt: z.string(),
  source: z.enum(['fixture', 'feishu']),
  articles: z.array(articleSummarySchema),
  redirects: z.record(z.string(), articleSlugRedirectSchema).optional(),
});

export const articleListResponseSchema = z.union([
  z.looseObject({
    status: z.literal(true),
    data: z.looseObject({
      total_pages: z.number(),
      total_posts: z.number(),
      page: z.number(),
      per_page: z.number(),
      posts: z.array(articleSummarySchema),
      featured_posts: z.array(articleSummarySchema),
    }),
  }),
  z.looseObject({ status: z.literal(false), error: z.string() }),
]);

export const articleSearchEntrySchema = articleSummarySchema.extend({
  tagNames: z.array(z.string()),
  bodyText: z.string(),
  searchableText: z.string(),
});

export const articleSearchIndexSchema = z.looseObject({
  generatedAt: z.string(),
  source: z.enum(['fixture', 'feishu']),
  articles: z.array(articleSearchEntrySchema),
});
