import { fireEvent, render, screen } from '@testing-library/react';

import Playground from '@/modules/playground';

jest.mock('@/common/components/elements/ModalWrapper', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/modules/playground/components/CodePlayground', () => ({
  __esModule: true,
  default: ({
    code,
    output,
    isError,
    onRunCode,
    onSetCode,
  }: {
    code: string;
    output: string;
    isError: boolean;
    onRunCode: () => void;
    onSetCode: (code: string) => void;
  }) => (
    <>
      <textarea
        aria-label='Code'
        value={code}
        onChange={(e) => onSetCode(e.target.value)}
      />
      <button onClick={onRunCode}>Run</button>
      <pre data-testid='result' data-error={isError}>
        {output}
      </pre>
    </>
  ),
}));

it('keeps editing, captured output, return values and runtime errors visible', () => {
  // eslint-disable-next-line no-console
  const log = console.log;
  try {
    render(<Playground initialCode='console.log("hello"); return 42;' />);
    fireEvent.click(screen.getByText('Run'));
    expect(screen.getByTestId('result')).toHaveTextContent('hello 42');
    // eslint-disable-next-line no-console
    expect(console.log).toBe(log);
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: 'throw new Error("broken")' },
    });
    fireEvent.click(screen.getByText('Run'));
    expect(screen.getByTestId('result')).toHaveAttribute('data-error', 'true');
    expect(screen.getByTestId('result')).toHaveTextContent('Error: broken');
    // eslint-disable-next-line no-console
    expect(console.log).toBe(log);
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: 'return 7;' },
    });
    fireEvent.click(screen.getByText('Run'));
    expect(screen.getByTestId('result')).toHaveAttribute('data-error', 'false');
    expect(screen.getByTestId('result')).toHaveTextContent('7');
  } finally {
    // eslint-disable-next-line no-console
    console.log = log;
  }
});

it('restores console.log before formatting the returned value', () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    render(
      <Playground initialCode='return { toString() { console.log(Symbol("result")); return "done"; } };' />,
    );
    fireEvent.click(screen.getByText('Run'));
    expect(screen.getByTestId('result')).toHaveAttribute('data-error', 'false');
    expect(screen.getByTestId('result')).toHaveTextContent('done');
    expect(log).toHaveBeenCalledWith(expect.any(Symbol));
  } finally {
    log.mockRestore();
  }
});

it.each([
  {
    kind: 'runtime error',
    code: 'console.log("before"); throw new Error("broken");',
  },
  { kind: 'syntax error', code: 'return (' },
  { kind: 'non-Error exception', code: 'throw "broken";' },
])('restores console.log after a $kind', ({ code }) => {
  // eslint-disable-next-line no-console
  const log = console.log;
  try {
    render(<Playground initialCode={code} />);
    fireEvent.click(screen.getByText('Run'));
    expect(screen.getByTestId('result')).toHaveAttribute('data-error', 'true');
    // eslint-disable-next-line no-console
    expect(console.log).toBe(log);
  } finally {
    // eslint-disable-next-line no-console
    console.log = log;
  }
});
