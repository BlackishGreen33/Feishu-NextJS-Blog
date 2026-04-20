import { BiLeftArrowCircle as BackButton } from 'react-icons/bi';
import Typewriter from 'typewriter-effect';

import Button from '@/common/components/elements/Button';
import MDXComponent from '@/common/components/elements/MDXComponent';
import { useI18n } from '@/i18n';

interface AiResponsesProps {
  response: string;
  isAiFinished: boolean;
  onAiFinished: () => void;
  onAiClose: () => void;
}

const AiResponses = ({
  response,
  isAiFinished,
  onAiFinished,
  onAiClose,
}: AiResponsesProps) => {
  const { messages } = useI18n();

  return (
    <>
      {response ? (
        response?.includes('```') ? (
          <MDXComponent>{response}</MDXComponent>
        ) : (
          <Typewriter
            onInit={(typewriter) => {
              typewriter
                .typeString(response)
                .callFunction(() => {
                  onAiFinished();
                })
                .start();
            }}
            options={{
              delay: 10,
            }}
          />
        )
      ) : (
        <Typewriter
          onInit={(typewriter) => {
            typewriter
              .typeString(`${messages.commandPalette.aiFallback.title} \u00A0`)
              .pauseFor(1000)
              .typeString('<br/><br/>')
              .typeString(`${messages.commandPalette.aiFallback.body} \u00A0`)
              .pauseFor(1000)
              .typeString('<br/><br/>')
              .typeString(`${messages.commandPalette.aiFallback.retry} \u00A0`)
              .callFunction(() => {
                onAiFinished();
              })
              .start();
          }}
          options={{
            delay: 10,
          }}
        />
      )}

      {isAiFinished && (
        <div className='mt-6 flex justify-center transition-all duration-300'>
          <Button
            onClick={onAiClose}
            data-umami-event='Click Back from AI Response'
          >
            <BackButton />
            {messages.common.back}
          </Button>
        </div>
      )}
    </>
  );
};

export default AiResponses;
