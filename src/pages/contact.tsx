import { NextPage } from 'next';
import Link from 'next/link';
import { NextSeo } from 'next-seo';

import Card from '@/common/components/elements/Card';
import Container from '@/common/components/elements/Container';
import PageHeading from '@/common/components/elements/PageHeading';
import { SITE_CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/common/config/site';

const PAGE_TITLE = '聯絡';
const PAGE_DESCRIPTION =
  '若你準備把飛書知識庫接到自己的網站，這裡列出最常用的對接資訊與部署前準備。';

const ContactPage: NextPage = () => {
  return (
    <>
      <NextSeo title={`${PAGE_TITLE} - ${SITE_NAME}`} />
      <Container data-aos='fade-up'>
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <div className='grid gap-5 lg:grid-cols-2'>
          <Card className='rounded-2xl border p-6 dark:border-neutral-800'>
            <h2 className='mb-3 text-lg font-medium'>部署前需要準備</h2>
            <ul className='list-disc space-y-3 pl-5 text-sm leading-7 text-neutral-600 dark:text-neutral-400'>
              <li>飛書自建應用的 `App ID` 與 `App Secret`。</li>
              <li>知識庫根節點的 token 與對應空間權限。</li>
              <li>
                若部署到 Vercel，需配置 `BLOB_READ_WRITE_TOKEN` 與
                `CRON_SECRET`。
              </li>
            </ul>
          </Card>

          <Card className='rounded-2xl border p-6 dark:border-neutral-800'>
            <h2 className='mb-3 text-lg font-medium'>常用入口</h2>
            <div className='space-y-3 text-sm leading-7 text-neutral-600 dark:text-neutral-400'>
              <p>
                站點網址：
                <span className='ml-2 font-medium text-neutral-900 dark:text-white'>
                  {SITE_URL}
                </span>
              </p>
              <p>
                聯絡郵箱：
                <a
                  href={`mailto:${SITE_CONTACT_EMAIL}`}
                  className='ml-2 font-medium text-teal-600 hover:underline dark:text-teal-400'
                >
                  {SITE_CONTACT_EMAIL}
                </a>
              </p>
              <p>
                若需要查看完整配置與同步方式，請直接閱讀
                <Link href='/blog/feishu-sync-architecture'>
                  <span className='ml-1 font-medium text-teal-600 hover:underline dark:text-teal-400'>
                    示例文章
                  </span>
                </Link>
                。
              </p>
            </div>
          </Card>
        </div>
      </Container>
    </>
  );
};

export default ContactPage;
