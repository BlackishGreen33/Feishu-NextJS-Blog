import {
  Article,
  ArticleListParams,
  ArticleListResult,
} from '@/common/types/blog';

import { getBlogStorage } from './storage';
import { sortArticlesByDate } from './utils';

const includeArticle = (article: Article | null, includeDraft: boolean) =>
  Boolean(article && (includeDraft || !article.draft));

export const getArticleIndex = async (includeDraft = false) => {
  const storage = getBlogStorage();
  const index = await storage.readIndex();

  if (!index) {
    throw new Error(
      'No synced blog index found. Run `yarn feishu:sync` or use the seed data.',
    );
  }

  const articles = includeDraft
    ? index.articles
    : index.articles.filter((article) => !article.draft);

  return {
    ...index,
    articles: sortArticlesByDate(articles),
  };
};

export const listArticles = async ({
  page = 1,
  perPage = 6,
  search,
  tag,
  featured,
  includeDraft = false,
}: ArticleListParams = {}): Promise<ArticleListResult> => {
  const index = await getArticleIndex(includeDraft);
  const normalizedSearch = search?.trim().toLowerCase();
  const normalizedTag = tag?.trim().toLowerCase();

  const filtered = index.articles.filter((article) => {
    if (featured && !article.featured) return false;

    if (
      normalizedTag &&
      !article.tags.some((item) => item.slug === normalizedTag)
    ) {
      return false;
    }

    if (!normalizedSearch) return true;

    const haystack = [
      article.title,
      article.summary,
      ...article.tags.map((item) => item.name),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const totalPosts = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / perPage));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (currentPage - 1) * perPage;

  return {
    page: currentPage,
    perPage,
    totalPages,
    totalPosts,
    posts: filtered.slice(startIndex, startIndex + perPage),
  };
};

export const getFeaturedArticles = async (limit = 4) => {
  const index = await getArticleIndex(false);
  return index.articles.filter((article) => article.featured).slice(0, limit);
};

export const getLatestArticles = async (limit = 6) => {
  const index = await getArticleIndex(false);
  return index.articles.slice(0, limit);
};

export const getArticleBySlug = async (slug: string, includeDraft = false) => {
  const storage = getBlogStorage();
  const article = await storage.readArticle(slug);

  if (!includeArticle(article, includeDraft)) {
    return null;
  }

  return article;
};

export const getAllArticleSlugs = async () => {
  const index = await getArticleIndex(false);
  return index.articles.map((article) => article.slug);
};
