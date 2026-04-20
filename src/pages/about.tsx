import { NextPage } from 'next';
import { NextSeo } from 'next-seo';
import { FiDatabase, FiFileText, FiLayers } from 'react-icons/fi';

import Card from '@/common/components/elements/Card';
import Container from '@/common/components/elements/Container';
import PageHeading from '@/common/components/elements/PageHeading';
import { SITE_NAME } from '@/common/config/site';

const PAGE_TITLE = '關於';
const PAGE_DESCRIPTION =
  '這個站點展示如何以飛書知識庫作為內容後台，透過同步流程將文章穩定輸出到 Next.js。';

const AboutPage: NextPage = () => {
  return (
    <>
      <NextSeo title={`${PAGE_TITLE} - ${SITE_NAME}`} />
      <Container data-aos='fade-up'>
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <div className='grid gap-5 md:grid-cols-3'>
          {[
            {
              title: '內容來源',
              description:
                '文章由飛書知識庫維護，作者在熟悉的協作環境中編寫內容，不需要另外登入 CMS。',
              icon: <FiFileText size={20} className='text-teal-500' />,
            },
            {
              title: '同步策略',
              description:
                '站點採用定時同步，而不是前台即時抓取飛書，確保頁面穩定、快取友好且易於追蹤。',
              icon: <FiLayers size={20} className='text-teal-500' />,
            },
            {
              title: '資料存儲',
              description:
                '本地開發可以直接落盤，部署到 Vercel 時則可切換到 Blob 儲存文章索引與資產。',
              icon: <FiDatabase size={20} className='text-teal-500' />,
            },
          ].map((item) => (
            <Card
              key={item.title}
              className='rounded-2xl border p-5 dark:border-neutral-800'
            >
              <div className='mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10'>
                {item.icon}
              </div>
              <h2 className='mb-2 text-lg font-medium'>{item.title}</h2>
              <p className='text-sm leading-7 text-neutral-600 dark:text-neutral-400'>
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </>
  );
};

export default AboutPage;
