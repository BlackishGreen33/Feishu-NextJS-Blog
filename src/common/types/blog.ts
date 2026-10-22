import type { z } from 'zod';

import type {
  articleFrontmatterSchema,
  articleIndexSchema,
  articleListResponseSchema,
  articleSchema,
  articleSearchEntrySchema,
  articleSearchIndexSchema,
  articleSlugRedirectSchema,
  articleSummarySchema,
  articleTagSchema,
} from '@/common/schemas/blog';
import type { legacyCommentSchema } from '@/common/schemas/comments';

export type ArticleTag = z.infer<typeof articleTagSchema>;

export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;

export type ArticleSummary = z.infer<typeof articleSummarySchema>;
export type Article = z.infer<typeof articleSchema>;
export type ArticleSlugRedirect = z.infer<typeof articleSlugRedirectSchema>;
export type ArticleIndex = z.infer<typeof articleIndexSchema>;
export type ArticleListResponse = z.infer<typeof articleListResponseSchema>;

export type ArticleSearchEntry = z.infer<typeof articleSearchEntrySchema>;
export type ArticleSearchIndex = z.infer<typeof articleSearchIndexSchema>;

export type ArticleListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  tag?: string;
  featured?: boolean;
  includeDraft?: boolean;
};

export type ArticleListResult = {
  page: number;
  perPage: number;
  totalPages: number;
  totalPosts: number;
  posts: ArticleSummary[];
};

export type BlogItemProps = ArticleSummary;
export type BlogDetailProps = Article;

export type BlogProps = {
  blogs: BlogItemProps[];
};

export type BlogFeaturedProps = {
  data: BlogItemProps[];
};

export type CommentItemProps = z.infer<typeof legacyCommentSchema>;
