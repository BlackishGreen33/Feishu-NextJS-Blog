import { useState } from 'react';

import ModalWrapper from '@/common/components/elements/ModalWrapper';

import CodePlayground from './CodePlayground';
import PlaygroundHeader from './PlaygroundHeader';

interface PlaygroundProps {
  id?: string | undefined;
  isHeading?: boolean;
  initialCode?: string;
}

const Playground = ({
  id = undefined,
  isHeading = false,
  initialCode,
}: PlaygroundProps) => {
  const [code, setCode] = useState<string>(initialCode ?? '');
  const [output, setOutput] = useState<string>('');
  const [isError, setError] = useState<boolean>(false);
  const [isFullScreen, setFullScreen] = useState<boolean>(false);

  const handleFullScreen = () => {
    setFullScreen(!isFullScreen);
  };

  const handleRunCode = () => {
    // Capturing console is the playground product behavior, not a debug log.
    // eslint-disable-next-line no-console
    const originalConsoleLog = console.log;
    try {
      setError(false);

      let capturedConsoleOutput = '';
      let result: unknown;
      try {
        // eslint-disable-next-line no-console
        console.log = (message: unknown) =>
          (capturedConsoleOutput += `${message}\n`);
        result = (new Function(code) as () => unknown)();
      } finally {
        // eslint-disable-next-line no-console
        console.log = originalConsoleLog;
      }
      setOutput(capturedConsoleOutput + (result == null ? '' : String(result)));
    } catch (error) {
      setError(true);
      if (error instanceof Error) {
        setOutput(error.toString());
      } else {
        setOutput('An unknown error occurred.');
      }
    }
  };

  return (
    <>
      {isHeading && <PlaygroundHeader />}

      <CodePlayground
        id={id}
        onFullScreen={handleFullScreen}
        code={code}
        output={output}
        isError={isError}
        onRunCode={handleRunCode}
        onSetCode={setCode}
        onSetOutput={setOutput}
      />

      <ModalWrapper isOpen={isFullScreen} onClose={handleFullScreen}>
        <CodePlayground
          id={id}
          isFullScreen={isFullScreen}
          onCloseFullScreen={handleFullScreen}
          code={code}
          output={output}
          isError={isError}
          onRunCode={handleRunCode}
          onSetCode={setCode}
          onSetOutput={setOutput}
        />
      </ModalWrapper>
    </>
  );
};

export default Playground;
