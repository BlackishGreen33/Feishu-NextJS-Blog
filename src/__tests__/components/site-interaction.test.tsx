import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useWindowSize } from 'usehooks-ts';

import LanguageSwitcher from '@/common/components/elements/LanguageSwitcher';
import { getLanguageAlternates, getLocalePath } from '@/common/config/seo';
import useHasMounted from '@/common/hooks/useHasMounted';
import useIsMobile from '@/common/hooks/useIsMobile';
import useLoading from '@/common/hooks/useLoading';
import { getMessages, normalizeLocale } from '@/i18n';

jest.mock('usehooks-ts', () => ({ useWindowSize: jest.fn() }));
const push = jest.fn().mockResolvedValue(true);
const router = {
  locale: 'en',
  pathname: '/blog/[slug]',
  query: { slug: 'hello', tag: 'tag' },
  asPath: '/blog/hello?tag=tag',
  isReady: false,
  push,
};
jest.mock('next/router', () => ({ useRouter: () => router }));

it('preserves page/query while switching locale and writes the existing cookie', async () => {
  render(<LanguageSwitcher compact />);
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', {
        name: getMessages('en').locale.options['zh-TW'].shortLabel,
      }),
    );
  });
  expect(push).toHaveBeenCalledWith(
    { pathname: router.pathname, query: router.query },
    router.asPath,
    { locale: 'zh-TW' },
  );
  expect(document.cookie).toContain('NEXT_LOCALE=zh-TW');
  push.mockClear();
  fireEvent.click(
    screen.getByRole('button', {
      name: getMessages('en').locale.options.en.shortLabel,
    }),
  );
  expect(push).not.toHaveBeenCalled();
});

it('keeps locale URL normalization, hash/query removal and unknown locale fallback', () => {
  expect(normalizeLocale('unknown')).toBe('zh-TW');
  expect(getLocalePath('/en/blog/hello?q=x#content', 'zh-TW')).toBe(
    '/blog/hello',
  );
  expect(getLocalePath('/zh-TW', 'en')).toBe('/en');
  expect(getLanguageAlternates('/blog').map((item) => item.hrefLang)).toEqual([
    'zh-TW',
    'zh-CN',
    'en',
  ]);
});

it('keeps the SSR mount placeholder and existing mobile/readiness transitions', () => {
  jest.mocked(useWindowSize).mockReturnValue({ width: 800, height: 600 });
  const Probe = () => (
    <span>
      {String(useHasMounted())}/{String(useIsMobile())}
    </span>
  );
  expect(renderToString(<Probe />)).toContain('false<!-- -->/<!-- -->false');
  const mounted = renderHook(useHasMounted);
  expect(mounted.result.current).toBe(true);
  const mobile = renderHook(useIsMobile);
  expect(mobile.result.current).toBe(true);
  jest.mocked(useWindowSize).mockReturnValue({ width: 821, height: 600 });
  mobile.rerender();
  expect(mobile.result.current).toBe(false);
  const loading = renderHook(useLoading);
  expect(loading.result.current).toBe(true);
  router.isReady = true;
  loading.rerender();
  expect(loading.result.current).toBe(false);
  router.isReady = false;
});
