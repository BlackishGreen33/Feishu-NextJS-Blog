export type ArticleTag = {
  name: string;
  slug: string;
};

export type ArticleFrontmatter = {
  slug?: string;
  title?: string;
  date?: string;
  tags?: string[] | string;
  summary?: string;
  cover?: string;
  featured?: boolean;
  draft?: boolean;
  hide?: boolean;
};

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover: string | null;
  publishedAt: string;
  updatedAt: string;
  tags: ArticleTag[];
  featured: boolean;
  draft: boolean;
  readingTimeMinutes: number;
  sourceNodeToken: string;
  sourceDocumentId: string;
};

export type Article = ArticleSummary & {
  content: string;
  contentFormat: 'markdown';
};

export type ArticleIndex = {
  generatedAt: string;
  source: 'fixture' | 'feishu';
  articles: ArticleSummary[];
};

export type BlogSyncAssetState = {
  pathname: string;
  url: string;
  contentType?: string | null;
  updatedAt: string;
};

export type BlogSyncDocumentState = {
  slug: string;
  sourceDocumentId: string;
  objEditTime?: string;
  revisionId?: string;
  coverToken?: string;
  assetTokens: string[];
};

export type BlogSyncState = {
  generatedAt: string;
  source: 'feishu';
  documents: Record<string, BlogSyncDocumentState>;
  assets: Record<string, BlogSyncAssetState>;
};

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

export type CommentItemProps = {
  type_of: string;
  id_code: string;
  created_at: string;
  body_html: string;
  user: {
    name: string;
    username: string;
    twitter_username: string;
    github_username: string;
    user_id: number;
    website_url: string;
    profile_image: string;
    profile_image_90: string;
  };
  children: CommentItemProps[];
};
