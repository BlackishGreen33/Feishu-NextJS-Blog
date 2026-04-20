import {
  FiArrowRight,
  FiDatabase,
  FiFileText,
  FiRefreshCw,
} from 'react-icons/fi';

import Breakline from '@/common/components/elements/Breakline';
import Card from '@/common/components/elements/Card';
import SectionHeading from '@/common/components/elements/SectionHeading';
import SectionSubHeading from '@/common/components/elements/SectionSubHeading';

import BlogPreview from './BlogPreview';

const Home = () => {
  return (
    <>
      <section className='space-y-6'>
        <div className='inline-flex rounded-full border border-teal-400/40 bg-teal-500/10 px-3 py-1 text-sm text-teal-600 dark:text-teal-300'>
          Feishu Wiki to Next.js
        </div>
        <div className='space-y-4'>
          <h1 className='max-w-4xl text-4xl font-semibold leading-tight text-neutral-900 dark:text-white sm:text-5xl'>
            把飛書知識庫同步成真正可維護、可搜尋、可部署的 Next.js 部落格。
          </h1>
          <p className='max-w-3xl text-base leading-8 text-neutral-600 dark:text-neutral-400 sm:text-lg'>
            這個專案採用「飛書文檔 → Markdown / 結構化索引 →
            網站渲染」的成熟路線。 內容由飛書維護，前台頁面由 Next.js 負責
            SEO、列表、搜尋、詳情與樣式。
          </p>
        </div>
        <div className='grid gap-4 md:grid-cols-3'>
          {[
            {
              title: '定時同步',
              description:
                '透過 Vercel Cron 週期觸發同步任務，避免每次前台請求都直連飛書 API。',
              icon: <FiRefreshCw className='text-teal-500' size={20} />,
            },
            {
              title: '結構化內容',
              description:
                '同步器會把文檔 block 轉成 Markdown，並生成文章索引、slug、標籤與摘要。',
              icon: <FiFileText className='text-teal-500' size={20} />,
            },
            {
              title: '可控存儲',
              description:
                '本地開發使用落盤資料，部署到 Vercel 時可切換為 Blob 存儲文章與資產。',
              icon: <FiDatabase className='text-teal-500' size={20} />,
            },
          ].map((item) => (
            <Card
              key={item.title}
              className='rounded-2xl border p-5 dark:border-neutral-800'
            >
              <div className='mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10'>
                {item.icon}
              </div>
              <h2 className='mb-2 text-lg font-medium text-neutral-900 dark:text-white'>
                {item.title}
              </h2>
              <p className='text-sm leading-7 text-neutral-600 dark:text-neutral-400'>
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </section>
      <Breakline className='mb-7 mt-8' />
      <BlogPreview />
      <Breakline className='my-8' />
      <section className='space-y-6'>
        <div className='flex items-center justify-between'>
          <SectionHeading title='同步流程' />
          <SectionSubHeading>從飛書到網站的完整交付鏈路</SectionSubHeading>
        </div>
        <div className='grid gap-4 lg:grid-cols-4'>
          {[
            '飛書自建應用換取 tenant_access_token',
            '遞迴遍歷指定知識庫子樹並抓取 docx block',
            '將文檔轉成 Markdown，下載圖片與附件',
            '由 Next.js 讀取索引與文章 JSON，完成站內渲染',
          ].map((step, index) => (
            <Card
              key={step}
              className='rounded-2xl border p-5 dark:border-neutral-800'
            >
              <div className='mb-4 flex items-center gap-2 text-sm text-teal-500'>
                <span className='font-mono'>0{index + 1}</span>
                <FiArrowRight size={16} />
              </div>
              <p className='text-sm leading-7 text-neutral-700 dark:text-neutral-300'>
                {step}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
};

export default Home;
