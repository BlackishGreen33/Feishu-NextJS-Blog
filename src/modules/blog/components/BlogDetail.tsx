import Breakline from '@/common/components/elements/Breakline';
import MDXComponent from '@/common/components/elements/MDXComponent';
import { BlogDetailProps } from '@/common/types/blog';
import { useI18n } from '@/i18n';

import BlogHeader from './BlogHeader';

const BlogDetail = ({
  title,
  publishedAt,
  updatedAt,
  content,
  tags,
  readingTimeMinutes,
}: BlogDetailProps) => {
  const { messages } = useI18n();

  return (
    <>
      <BlogHeader
        title={title}
        reading_time_minutes={readingTimeMinutes}
        published_at={publishedAt}
        updated_at={updatedAt}
      />
      <div className='space-y-6 leading-[1.8] dark:text-neutral-300'>
        {content && <MDXComponent>{content}</MDXComponent>}
      </div>
      {tags?.length >= 1 && (
        <div className='my-10 space-y-2'>
          <h6 className='text-lg font-medium'>{messages.blog.tags}</h6>
          <div className='flex flex-wrap gap-2 pt-2'>
            {tags.map((tag) => (
              <div
                key={tag.slug}
                className='rounded-full bg-neutral-200 px-4 py-1 text-[14px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200'
              >
                <span className='mr-1 font-semibold'>#</span>
                {tag.name}
              </div>
            ))}
          </div>
        </div>
      )}
      <Breakline className='!my-10' />
    </>
  );
};

export default BlogDetail;
