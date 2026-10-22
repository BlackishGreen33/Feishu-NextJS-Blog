jest.mock('@/server/blog/repository', () => ({
  getAllArticleSlugs: jest.fn(),
  getArticleBySlug: jest.fn(),
  getArticleRedirectBySlug: jest.fn(),
}));
jest.mock('@/modules/blog/components/BlogDetail', () => () => null);
jest.mock('@/common/components/elements/BackButton', () => () => null);
jest.mock('@/common/components/elements/Container', () => () => null);
jest.mock('next-seo', () => ({ NextSeo: () => null }));

import { getStaticProps } from '@/pages/blog/[slug]';

const repositoryMock = jest.requireMock('@/server/blog/repository') as {
  getArticleBySlug: jest.Mock;
  getArticleRedirectBySlug: jest.Mock;
};

describe('blog detail slug routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['en', '/en/blog/new-title'],
    ['zh-TW', '/blog/new-title'],
    ['zh-CN', '/zh-CN/blog/new-title'],
  ])(
    'permanently redirects an old slug within the %s locale',
    async (locale, destination) => {
      repositoryMock.getArticleRedirectBySlug.mockResolvedValue('new-title');

      const result = await getStaticProps({
        params: { slug: 'old-title' },
        locale,
      });

      expect(result).toEqual({
        redirect: {
          destination,
          permanent: true,
        },
        revalidate: 60,
      });
      expect(repositoryMock.getArticleBySlug).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      'zh-TW',
      '/blog/10-%E5%80%8B%E5%88%9D%E5%AD%B8-css-%E5%BF%85%E9%A0%88%E6%8E%8C%E6%8F%A1%E7%9A%84%E5%B0%8F%E6%8A%80%E5%B7%A7',
    ],
    [
      'en',
      '/en/blog/10-%E5%80%8B%E5%88%9D%E5%AD%B8-css-%E5%BF%85%E9%A0%88%E6%8E%8C%E6%8F%A1%E7%9A%84%E5%B0%8F%E6%8A%80%E5%B7%A7',
    ],
    [
      'zh-CN',
      '/zh-CN/blog/10-%E5%80%8B%E5%88%9D%E5%AD%B8-css-%E5%BF%85%E9%A0%88%E6%8E%8C%E6%8F%A1%E7%9A%84%E5%B0%8F%E6%8A%80%E5%B7%A7',
    ],
  ])(
    'permanently redirects the old CSS slug with a header-safe destination in %s',
    async (locale, destination) => {
      repositoryMock.getArticleRedirectBySlug.mockResolvedValue(
        '10-個初學-css-必須掌握的小技巧',
      );

      const result = await getStaticProps({
        params: { slug: '10-個-css-小技巧' },
        locale,
      });

      expect(result).toEqual({
        redirect: { destination, permanent: true },
        revalidate: 60,
      });
      expect(repositoryMock.getArticleBySlug).not.toHaveBeenCalled();
    },
  );
});
