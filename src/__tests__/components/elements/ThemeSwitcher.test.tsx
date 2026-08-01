import { useTheme } from 'next-themes';
import { render, screen } from '@testing-library/react';

import ThemeSwitcher from '@/common/components/elements/ThemeSwitcher';

jest.mock('next/router', () => ({
  useRouter: () => ({ locale: 'zh-TW' }),
}));

jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

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
});
