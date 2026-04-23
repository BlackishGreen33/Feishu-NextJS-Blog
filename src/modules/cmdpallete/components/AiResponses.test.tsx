import { act, render, screen } from '@testing-library/react';

import AiResponses from './AiResponses';

jest.mock('next/router', () => ({
  useRouter: () => ({
    locale: 'zh-TW',
  }),
}));

jest.mock('@/common/components/elements/MDXComponent', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => (
    <div data-testid='mdx-response'>{children}</div>
  ),
}));

describe('AiResponses', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders streamed markdown content after chunks arrive', () => {
    const onAiFinished = jest.fn();

    const { rerender } = render(
      <AiResponses
        response=''
        isAiFinished={false}
        isStreaming={true}
        onAiFinished={onAiFinished}
        onAiClose={() => undefined}
      />,
    );

    rerender(
      <AiResponses
        response={'## 歡迎\n\n- 首頁'}
        isAiFinished={false}
        isStreaming={true}
        onAiFinished={onAiFinished}
        onAiClose={() => undefined}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByTestId('mdx-response')).toHaveTextContent('歡迎');
    expect(screen.getByTestId('mdx-response')).toHaveTextContent('首頁');
    expect(onAiFinished).not.toHaveBeenCalled();
  });

  it('marks the response finished after typing drains', () => {
    const onAiFinished = jest.fn();

    render(
      <AiResponses
        response='完成的回答'
        isAiFinished={false}
        isStreaming={false}
        onAiFinished={onAiFinished}
        onAiClose={() => undefined}
      />,
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByTestId('mdx-response')).toHaveTextContent('完成的回答');
    expect(onAiFinished).toHaveBeenCalledTimes(1);
  });
});
