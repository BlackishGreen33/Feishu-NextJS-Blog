import { render, screen, within } from '@testing-library/react';

import CommandPalette from '@/common/components/elements/CommandPalette';
import { CommandPaletteContext } from '@/common/context/CommandPaletteContext';
import { getMessages } from '@/i18n';

let mockLocale = 'zh-TW';
jest.mock('next/router', () => ({
  useRouter: () => ({ locale: mockLocale, asPath: '/', push: jest.fn() }),
}));
jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme: jest.fn() }),
}));
jest.mock('@/common/hooks/useIsMobile', () => ({
  __esModule: true,
  default: () => true,
}));
jest.mock('usehooks-ts', () => ({
  useDebounceValue: (value: string) => [value],
}));
jest.mock('swr', () => ({
  __esModule: true,
  default: () => ({
    isLoading: false,
    data: {
      status: true,
      data: {
        posts: [{ title: 'Article result', slug: 'example', summary: '' }],
      },
    },
  }),
}));
jest.mock('@/modules/cmdpallete/components/AiResponses', () => ({
  __esModule: true,
  default: () => null,
}));

it.each([
  ['zh-TW', '頁面', '外連'],
  ['zh-CN', '页面', '外链'],
  ['en', 'Page', 'Link'],
])(
  'localizes result badges in %s while preserving article and current-page labels',
  async (locale, pageLabel, linkLabel) => {
    mockLocale = locale;
    const messages = getMessages(locale);
    const noop = () => {};
    render(
      <CommandPaletteContext.Provider
        value={{
          isOpen: true,
          setIsOpen: noop,
          closePalette: noop,
          openPalette: noop,
          preloadPalette: noop,
        }}
      >
        <CommandPalette />
      </CommandPaletteContext.Provider>,
    );

    const article = await screen.findByRole('option', {
      name: `Article result ${messages.nav.blog}`,
    });
    expect(within(article).getByText(messages.nav.blog)).toBeVisible();
    expect(
      within(
        screen.getByRole('option', { name: new RegExp(messages.nav.about) }),
      ).getByText(pageLabel),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole('option', { name: new RegExp(messages.nav.github) }),
      ).getByText(linkLabel),
    ).toBeVisible();
    const currentPage = screen.getByRole('option', {
      name: new RegExp(messages.nav.home),
    });
    expect(
      within(currentPage).getByText(messages.commandPalette.currentPage),
    ).toBeVisible();
    expect(within(currentPage).queryByText(pageLabel)).not.toBeInTheDocument();
  },
);
