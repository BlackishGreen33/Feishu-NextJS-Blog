import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { spawnSync } from 'node:child_process';
import { hydrateRoot } from 'react-dom/client';

import ClientCodeBlock, {
  CodeBlockBase as CodeBlock,
} from '@/common/components/elements/CodeBlock';

jest.mock('@/common/components/elements/codeLanguages', () => ({
  SyntaxHighlighter: ({ children }: { children: React.ReactNode }) => (
    <pre>
      <code>{children}</code>
    </pre>
  ),
  getCodeLanguage: () => ({ language: 'text', label: 'Plain Text' }),
}));
let mockTheme = 'light';
jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mockTheme }),
}));
jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));

it('hydrates actual server code placeholders even after the client module is warm', async () => {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('tsx/cli'),
      '--eval',
      `
    import React from 'react';
    import { renderToString } from 'react-dom/server';
    import CodeBlock from './src/common/components/elements/CodeBlock';
    process.stdout.write(renderToString(React.createElement(CodeBlock, { isBlock: true }, 'const n = 1;')));
  `,
    ],
    { cwd: process.cwd(), encoding: 'utf8', timeout: 15000 },
  );
  expect(result.status).toBe(0);
  const warm = render(
    <ClientCodeBlock isBlock>previous article</ClientCodeBlock>,
  );
  await waitFor(() =>
    expect(warm.container.querySelector('code')).not.toBeNull(),
  );
  warm.unmount();
  const container = document.createElement('div');
  container.innerHTML = result.stdout;
  document.body.append(container);
  const recoveries: unknown[] = [];
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(
      container,
      <ClientCodeBlock isBlock>const n = 1;</ClientCodeBlock>,
      {
        onRecoverableError: (error) => {
          recoveries.push(error);
        },
      },
    );
  });
  await waitFor(() =>
    expect(container.querySelector('code')?.textContent).toBe('const n = 1;'),
  );
  act(() => root?.unmount());
  container.remove();
  expect(recoveries).toHaveLength(0);
});

describe('CodeBlock controls', () => {
  it('keeps inline code without a toolbar', () => {
    render(<CodeBlock>inline</CodeBlock>);
    expect(screen.getByText('inline').tagName).toBe('CODE');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('copies exact plain text and confirms success', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<CodeBlock isBlock>{'  hello\nworld\n'}</CodeBlock>);
    expect(screen.getByText('Plain Text')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy to Clipboard' }).textContent,
    ).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Copy to Clipboard' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('  hello\nworld\n'),
    );
    expect(
      await screen.findByRole('button', { name: 'Copied' }),
    ).toBeInTheDocument();
  });
});
