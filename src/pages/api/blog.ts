import type { NextApiRequest, NextApiResponse } from 'next';

import { getFeaturedArticles, listArticles } from '@/server/blog/repository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300',
    );

    const { page, per_page, search, tag, featured, featured_limit } = req.query;
    const isFeaturedOnly = featured === 'true';

    const result = await listArticles({
      page: Number(page) || 1,
      perPage: Number(per_page) || 9,
      search: search ? String(search) : undefined,
      tag: tag ? String(tag) : undefined,
      featured: isFeaturedOnly || undefined,
    });

    const featuredPosts = await getFeaturedArticles(
      Number(featured_limit) || 4,
    );

    res.status(200).json({
      status: true,
      data: {
        total_pages: result.totalPages,
        total_posts: result.totalPosts,
        page: result.page,
        per_page: result.perPage,
        posts: result.posts,
        featured_posts: featuredPosts,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
