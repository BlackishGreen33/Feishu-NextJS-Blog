import { useTheme } from 'next-themes';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ThemeSwitcher from '@/common/components/elements/ThemeSwitcher';

jest.mock('next/router', () => ({
  useRouter: () => ({ locale: 'zh-TW' }),
}));

jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: jest.fn((media: string) => ({
      matches: reducedMotion,
      media,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: undefined,
  });
});

describe('ThemeSwitcher', () => {
  it('keeps the compact toggle perfectly circular in constrained layouts', async () => {
    mockedUseTheme.mockReturnValue({
      resolvedTheme: 'dark',
      setTheme: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);

    render(<ThemeSwitcher compact />);

    expect(await screen.findByRole('button', { name: '切換主題' })).toHaveClass(
      'aspect-square',
      'size-10',
      'shrink-0',
      'rounded-full',
    );
  });

  it.each([false, true])(
    'falls back immediately when reduced motion is %s',
    async (reduced) => {
      const setTheme = jest.fn();
      mockedUseTheme.mockReturnValue({
        resolvedTheme: 'dark',
        setTheme,
        themes: ['light', 'dark'],
      });
      const start = jest.fn();
      if (reduced)
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: start,
        });
      reducedMotion = reduced;
      render(<ThemeSwitcher compact />);
      fireEvent.click(await screen.findByRole('button', { name: '切換主題' }));
      expect(setTheme).toHaveBeenCalledWith('light');
      expect(start).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    },
  );

  it('reveals the next theme from the button through a native view transition', async () => {
    const setTheme = jest.fn();
    mockedUseTheme.mockReturnValue({
      resolvedTheme: 'dark',
      setTheme,
      themes: ['light', 'dark'],
    });
    const animate = jest
      .fn()
      .mockReturnValue({ finished: Promise.resolve(), cancel: jest.fn() });
    Object.defineProperty(document.documentElement, 'animate', {
      configurable: true,
      value: animate,
    });
    const start = jest.fn((update: () => void) => {
      update();
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        skipTransition: jest.fn(),
      };
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: start,
    });
    render(<ThemeSwitcher compact />);
    fireEvent.click(await screen.findByRole('button', { name: '切換主題' }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(setTheme).toHaveBeenCalledWith('light');
    await waitFor(() =>
      expect(animate).toHaveBeenCalledWith(
        {
          clipPath: [
            expect.stringContaining('circle(0%'),
            expect.stringContaining('circle('),
          ],
        },
        expect.objectContaining({
          duration: 250,
          pseudoElement: '::view-transition-new(root)',
        }),
      ),
    );
    jest.restoreAllMocks();
  });

  it('still changes theme and releases the transition when the browser API throws', async () => {
    const setTheme = jest.fn();
    mockedUseTheme.mockReturnValue({
      resolvedTheme: 'dark',
      setTheme,
      themes: ['light', 'dark'],
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: () => {
        throw new Error('transition unavailable');
      },
    });
    render(<ThemeSwitcher compact />);
    fireEvent.click(await screen.findByRole('button', { name: '切換主題' }));
    await waitFor(() => expect(setTheme).toHaveBeenCalledWith('light'));
    expect(document.documentElement.dataset.magicuiThemeVt).toBeUndefined();
    expect(
      document.documentElement.style.getPropertyValue(
        '--magicui-theme-vt-clip-from',
      ),
    ).toBe('');
  });

  it('releases a pending transition on unmount without starting a late animation', async () => {
    const setTheme = jest.fn();
    mockedUseTheme.mockReturnValue({
      resolvedTheme: 'dark',
      setTheme,
      themes: ['light', 'dark'],
    });
    let resolveReady = () => {};
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const skipTransition = jest.fn();
    const animate = jest.fn();
    Object.defineProperty(document.documentElement, 'animate', {
      configurable: true,
      value: animate,
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (update: () => void) => {
        update();
        return { ready, finished: Promise.resolve(), skipTransition };
      },
    });
    const view = render(<ThemeSwitcher compact />);
    fireEvent.click(await screen.findByRole('button', { name: '切換主題' }));
    view.unmount();
    resolveReady();
    await ready;
    expect(skipTransition).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
    expect(setTheme).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.magicuiThemeVt).toBeUndefined();
  });
});
