import React, { useMemo } from 'react';
import useSWR from 'swr';

import BlogFeaturedHeroSkeleton from '@/common/components/skeleton/BlogFeaturedHeroSkeleton';
import { articleListResponseSchema } from '@/common/schemas/blog';
import { BlogItemProps } from '@/common/types/blog';
import { fetchValidated } from '@/services/fetcher';

import BlogFeaturedHero from './BlogFeaturedHero';

const BlogFeaturedSection = () => {
  const { data, isLoading } = useSWR(
    `/api/blog?page=1&per_page=4&featured=true`,
    (url: string) => fetchValidated(url, articleListResponseSchema.parse),
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    },
  );

  const featuredData: BlogItemProps[] = useMemo(() => {
    return data?.status ? data.data.posts : [];
  }, [data]);

  return (
    <>
      {!isLoading ? (
        <BlogFeaturedHero data={featuredData} />
      ) : (
        <BlogFeaturedHeroSkeleton />
      )}
    </>
  );
};

export default BlogFeaturedSection;
