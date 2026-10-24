import Giscus from '@giscus/react';
import { render } from '@testing-library/react';

import GiscusComment from '@/modules/blog/components/GiscusComment';

let mockLocale = 'zh-TW';
let mockTheme = 'dark';
jest.mock('@giscus/react', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('next/router', () => ({ useRouter: () => ({ locale: mockLocale }) }));
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', resolvedTheme: mockTheme }),
}));
const widget = jest.mocked(Giscus);

beforeEach(() => {
  widget.mockClear();
  mockLocale = 'zh-TW';
  mockTheme = 'dark';
});
it('binds a stable article discussion with reactions and the resolved system theme', () => {
  render(<GiscusComment discussionTerm='blog:node-1' isEnableReaction />);
  expect(widget.mock.calls[0]?.[0]).toEqual(
    expect.objectContaining({
      repo: 'BlackishGreen33/Feishu-NextJS-Blog',
      category: 'Announcements',
      mapping: 'specific',
      term: 'blog:node-1',
      strict: '1',
      reactionsEnabled: '1',
      lang: 'zh-TW',
      theme: 'transparent_dark',
      inputPosition: 'top',
      loading: 'lazy',
    }),
  );
});
it.each(['zh-TW', 'zh-CN', 'en'])(
  'shares the article discussion in %s',
  (locale) => {
    mockLocale = locale;
    render(<GiscusComment discussionTerm='blog:node-1' />);
    expect(widget.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ term: 'blog:node-1', lang: locale }),
    );
  },
);
it('updates theme and article identity without retaining the previous term', () => {
  const { rerender } = render(<GiscusComment discussionTerm='blog:node-1' />);
  mockTheme = 'light';
  rerender(<GiscusComment discussionTerm='blog:node-2' />);
  expect(widget.mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({ term: 'blog:node-2', theme: 'light' }),
  );
});
it('preserves pathname mapping for the existing Learn caller', () => {
  render(<GiscusComment />);
  expect(widget.mock.calls[0]?.[0]).toEqual(
    expect.objectContaining({
      mapping: 'pathname',
      strict: '0',
      reactionsEnabled: '0',
    }),
  );
});
