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
    try {
      setError(false);

      let capturedConsoleOutput = '';
      // Capturing console is the playground product behavior, not a debug log.
      /* eslint-disable no-console */
      const originalConsoleLog = console.log;

      console.log = (message: unknown) =>
        (capturedConsoleOutput += `${message}\n`);

      const result: unknown = (new Function(code) as () => unknown)();
      console.log = originalConsoleLog;
      /* eslint-enable no-console */

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
