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
  // Existing execution captures console globally; restore the test environment after errors.
  // eslint-disable-next-line no-console
  const log = console.log;
  try {
    render(<Playground initialCode='console.log("hello"); return 42;' />);
    fireEvent.click(screen.getByText('Run'));
    expect(screen.getByTestId('result')).toHaveTextContent('hello 42');
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: 'throw new Error("broken")' },
    });
    fireEvent.click(screen.getByText('Run'));
    expect(screen.getByTestId('result')).toHaveAttribute('data-error', 'true');
    expect(screen.getByTestId('result')).toHaveTextContent('Error: broken');
  } finally {
    // eslint-disable-next-line no-console
    console.log = log;
  }
});
