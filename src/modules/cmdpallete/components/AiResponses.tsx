import { useCallback, useEffect, useRef, useState } from 'react';
import { BiLeftArrowCircle as BackButton } from 'react-icons/bi';

import Button from '@/common/components/elements/Button';
import MDXComponent from '@/common/components/elements/MDXComponent';
import { useI18n } from '@/i18n';
import { normalizeStreamingMarkdown } from '@/modules/cmdpallete/libs/normalizeStreamingMarkdown';

interface AiResponsesProps {
  response: string;
  isAiFinished: boolean;
  isStreaming: boolean;
  onAiFinished: () => void;
  onAiClose: () => void;
}

const INLINE_MARKDOWN_PATTERN =
  /(```[\s\S]*?```|`[^`\n]+`|\*\*[^*\n]+?\*\*|__[^_\n]+?__|\*[^*\n]+?\*|_[^_\n]+?_|~~[^~\n]+?~~|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g;

const TYPEWRITER_BASE_DELAY = 22;

const splitPlainTextTokens = (value: string) =>
  value.match(/\S+\s*|\s+/g) || [];

const tokenizeInlineMarkdown = (value: string) => {
  const tokens: string[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(INLINE_MARKDOWN_PATTERN)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      tokens.push(...splitPlainTextTokens(value.slice(lastIndex, matchIndex)));
    }

    tokens.push(match[0]);
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < value.length) {
    tokens.push(...splitPlainTextTokens(value.slice(lastIndex)));
  }

  return tokens;
};

const tokenizeMarkdownForTypewriter = (value: string) => {
  const tokens: string[] = [];
  const lines = value.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.startsWith('```')) {
      const codeBlockLines = [line];

      while (index + 1 < lines.length) {
        index += 1;
        codeBlockLines.push(lines[index]);

        if (lines[index].startsWith('```')) {
          break;
        }
      }

      tokens.push(codeBlockLines.join('\n'));
    } else {
      tokens.push(...tokenizeInlineMarkdown(line));
    }

    if (index < lines.length - 1) {
      tokens.push('\n');
    }
  }

  return tokens.filter(Boolean);
};

const getTypingDelay = (token: string) => {
  if (token.includes('```')) {
    return 120;
  }

  if (token === '\n') {
    return 90;
  }

  if (/^[,.;:!?)]\s*$/.test(token) || /[。！？：；，]$/.test(token.trim())) {
    return 40;
  }

  return TYPEWRITER_BASE_DELAY;
};

const AiResponses = ({
  response,
  isAiFinished,
  isStreaming,
  onAiFinished,
  onAiClose,
}: AiResponsesProps) => {
  const { messages } = useI18n();
  const [displayedResponse, setDisplayedResponse] = useState('');
  const fallbackResponse = [
    `## ${messages.commandPalette.aiFallback.title}`,
    messages.commandPalette.aiFallback.body,
    messages.commandPalette.aiFallback.retry,
  ].join('\n\n');
  const renderedResponse = response?.trim() || fallbackResponse;
  const normalizedDisplayedResponse =
    normalizeStreamingMarkdown(displayedResponse);
  const onAiFinishedRef = useRef(onAiFinished);
  const isStreamingRef = useRef(isStreaming);
  const renderedResponseRef = useRef(renderedResponse);
  const sourceResponseRef = useRef('');
  const displayedResponseRef = useRef('');
  const tokenQueueRef = useRef<string[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const visibilityTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const finishNotifiedRef = useRef(false);

  const resetTypingState = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (visibilityTimeoutRef.current) {
      window.clearTimeout(visibilityTimeoutRef.current);
      visibilityTimeoutRef.current = null;
    }

    sourceResponseRef.current = '';
    displayedResponseRef.current = '';
    tokenQueueRef.current = [];
    isTypingRef.current = false;
    finishNotifiedRef.current = false;
    setDisplayedResponse('');
  }, []);

  const syncDisplayedResponse = useCallback((nextValue: string) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (visibilityTimeoutRef.current) {
      window.clearTimeout(visibilityTimeoutRef.current);
      visibilityTimeoutRef.current = null;
    }

    tokenQueueRef.current = [];
    isTypingRef.current = false;
    displayedResponseRef.current = nextValue;
    setDisplayedResponse(nextValue);
  }, []);

  const tryNotifyFinished = useCallback(() => {
    if (
      !isStreamingRef.current &&
      !finishNotifiedRef.current &&
      displayedResponseRef.current === renderedResponseRef.current
    ) {
      finishNotifiedRef.current = true;
      onAiFinishedRef.current();
    }
  }, []);

  const ensureTyping = useCallback(() => {
    if (isTypingRef.current || tokenQueueRef.current.length === 0) {
      tryNotifyFinished();
      return;
    }

    const tick = () => {
      const nextToken = tokenQueueRef.current.shift();

      if (!nextToken) {
        isTypingRef.current = false;
        tryNotifyFinished();
        return;
      }

      const nextValue = displayedResponseRef.current + nextToken;
      displayedResponseRef.current = nextValue;
      setDisplayedResponse(nextValue);

      if (tokenQueueRef.current.length === 0) {
        isTypingRef.current = false;
        tryNotifyFinished();
        return;
      }

      timeoutRef.current = window.setTimeout(tick, getTypingDelay(nextToken));
    };

    isTypingRef.current = true;
    timeoutRef.current = window.setTimeout(tick, TYPEWRITER_BASE_DELAY);
  }, [tryNotifyFinished]);

  useEffect(() => {
    onAiFinishedRef.current = onAiFinished;
  }, [onAiFinished]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
    renderedResponseRef.current = renderedResponse;
  }, [isStreaming, renderedResponse]);

  useEffect(() => {
    if (!response && isStreaming) {
      resetTypingState();
      return;
    }

    if (!renderedResponse.startsWith(sourceResponseRef.current)) {
      resetTypingState();
    }

    const appendedContent = renderedResponse.slice(
      sourceResponseRef.current.length,
    );
    sourceResponseRef.current = renderedResponse;

    if (appendedContent) {
      tokenQueueRef.current.push(
        ...tokenizeMarkdownForTypewriter(appendedContent),
      );
    }

    ensureTyping();
  }, [ensureTyping, isStreaming, renderedResponse, resetTypingState, response]);

  useEffect(() => {
    tryNotifyFinished();
  }, [isStreaming, renderedResponse, tryNotifyFinished]);

  useEffect(() => {
    if (!response?.trim() || displayedResponseRef.current) {
      return;
    }

    visibilityTimeoutRef.current = window.setTimeout(() => {
      if (!displayedResponseRef.current && sourceResponseRef.current) {
        syncDisplayedResponse(sourceResponseRef.current);
      }
    }, 250);

    return () => {
      if (visibilityTimeoutRef.current) {
        window.clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
    };
  }, [displayedResponse, response, syncDisplayedResponse]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      if (visibilityTimeoutRef.current) {
        window.clearTimeout(visibilityTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <>
      <div className='space-y-4 text-left break-words'>
        <MDXComponent allowRawHtml={false}>
          {normalizedDisplayedResponse}
        </MDXComponent>
      </div>

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
