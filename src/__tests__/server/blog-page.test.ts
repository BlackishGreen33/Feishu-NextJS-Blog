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
});
