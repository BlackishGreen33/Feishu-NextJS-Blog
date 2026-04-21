import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

jest.mock('react-syntax-highlighter', () => {
  const PrismLight = ({ children }: { children?: ReactNode }) => (
    <pre>{children}</pre>
  );

  PrismLight.registerLanguage = jest.fn();

  return { PrismLight };
});
jest.mock(
  'react-syntax-highlighter/dist/cjs/languages/prism/css',
  () => () => null,
);
jest.mock(
  'react-syntax-highlighter/dist/cjs/languages/prism/diff',
  () => () => null,
);
jest.mock(
  'react-syntax-highlighter/dist/cjs/languages/prism/javascript',
  () => () => null,
);
jest.mock(
  'react-syntax-highlighter/dist/cjs/languages/prism/tsx',
  () => () => null,
);
jest.mock(
  'react-syntax-highlighter/dist/cjs/languages/prism/typescript',
  () => () => null,
);
jest.mock('react-syntax-highlighter/dist/cjs/styles/prism', () => ({
  a11yDark: {},
}));

import { CodeBlockBase as CodeBlock } from '@/common/components/elements/CodeBlock';

describe('CodeBlock', () => {
  it('renders inline code without the copy action', async () => {
    render(<CodeBlock>inline</CodeBlock>);

    expect(await screen.findByText('inline')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Copy to Clipboard'),
    ).not.toBeInTheDocument();
  });

  it('renders block code with the copy action', async () => {
    render(
      <CodeBlock isBlock className='language-css'>
        {'.button {\n  color: red;\n}'}
      </CodeBlock>,
    );

    expect(
      await screen.findByLabelText('Copy to Clipboard'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('.button')),
    ).toBeInTheDocument();
  });
});
