import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useDebounceValue } from 'usehooks-ts';

import EmptyState from '@/common/components/elements/EmptyState';
import Pagination from '@/common/components/elements/Pagination';
import SearchBar from '@/common/components/elements/SearchBar';
import BlogCardNewSkeleton from '@/common/components/skeleton/BlogCardNewSkeleton';
import { BlogItemProps } from '@/common/types/blog';
import { useI18n } from '@/i18n';
import { fetcher } from '@/services/fetcher';

import BlogCardNew from './BlogCardNew';
import BlogFeaturedSection from './BlogFeaturedSection';

const BlogListNew = () => {
  const { messages } = useI18n();
  const [page, setPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const router = useRouter();
  const activeTag = Array.isArray(router.query.tag)
    ? router.query.tag[0] || ''
    : router.query.tag || '';

  const [debouncedSearchTerm] = useDebounceValue(searchTerm, 500);

  const requestParams = new URLSearchParams({
    page: String(page),
    per_page: '6',
  });
  if (debouncedSearchTerm) {
    requestParams.set('search', debouncedSearchTerm);
  }
  if (activeTag) {
    requestParams.set('tag', activeTag);
  }

  const { data, error, mutate, isValidating } = useSWR(
    `/api/blog?${requestParams.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    },
  );

  const {
    posts: blogData = [],
    total_pages: totalPages = 1,
    total_posts = 0,
  } = data?.data || {};

  const handlePageChange = async (newPage: number) => {
    await mutate();
    router.push(
      {
        pathname: '/blog',
        query: {
          page: newPage,
          ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
          ...(activeTag && { tag: activeTag }),
        },
      },
      undefined,
      { shallow: true },
    );
    setPage(newPage);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = event?.target?.value;
    setSearchTerm(searchValue);
    setPage(1);

    router.push(
      {
        pathname: '/blog',
        query: {
          page: 1,
          ...(searchValue && { search: searchValue }),
          ...(activeTag && { tag: activeTag }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);

    router.push(
      {
        pathname: '/blog',
        query: { page: 1, ...(activeTag && { tag: activeTag }) },
      },
      undefined,
      { shallow: true },
    );
  };

  useEffect(() => {
    const queryPage = Number(router.query.page);
    const nextPage =
      Number.isInteger(queryPage) && queryPage >= 1 ? queryPage : 1;
    setPage((currentPage) =>
      currentPage === nextPage ? currentPage : nextPage,
    );
  }, [activeTag, router.query.page]);

  const renderEmptyState = () =>
    !isValidating &&
    (!data?.status || blogData.length === 0) && (
      <EmptyState
        message={
          error ? messages.blog.loadingFailed : messages.blog.noMatchingPosts
        }
      />
    );

  return (
    <div className='space-y-10'>
      {!activeTag && <BlogFeaturedSection />}

      <div className='space-y-5'>
        <div className='mb-6 flex flex-col items-center justify-between gap-3 sm:flex-row'>
          <div className='flex items-center gap-2 px-1 text-xl font-medium'>
            {activeTag ? (
              <div>
                <span className='mr-2 text-neutral-600 dark:text-neutral-400'>
                  {messages.blog.tags}
                </span>
                <span>{`#${activeTag}`}</span>
              </div>
            ) : searchTerm ? (
              <div>
                <span className='mr-2 text-neutral-600 dark:text-neutral-400'>
                  {messages.blog.searchKeyword}
                </span>
                <span className='italic'>{searchTerm}</span>
              </div>
            ) : (
              <h4 className='text-neutral-800 dark:text-neutral-200'>
                {messages.blog.latestArticles}
              </h4>
            )}
            <span className='rounded-full bg-neutral-300 px-2 py-1 text-xs text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50'>
              {total_posts}
            </span>
          </div>
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={handleSearch}
            onClearSearch={handleClearSearch}
          />
        </div>

        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'>
          {!isValidating ? (
            <>
              {blogData.map((item: BlogItemProps, index: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <BlogCardNew {...item} priority={index < 3} />
                </motion.div>
              ))}
            </>
          ) : (
            <>
              {new Array(3).fill(0).map((_, index) => (
                <BlogCardNewSkeleton key={index} />
              ))}
            </>
          )}
        </div>

        {!isValidating && data?.status && (
          <Pagination
            totalPages={totalPages}
            currentPage={page}
            onPageChange={handlePageChange}
          />
        )}

        {renderEmptyState()}
      </div>
    </div>
  );
};

export default BlogListNew;
