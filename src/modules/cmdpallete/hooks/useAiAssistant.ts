import { useCallback, useEffect, useRef, useState } from 'react';

import { sendMessageStream } from '@/services/ai';
export const useAiAssistant = ({
  prompt,
  locale,
  currentPath,
}: {
  prompt: string;
  locale?: string;
  currentPath?: string;
}) => {
  const [askAssistantClicked, setAskAssistantClicked] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiFinished, setAiFinished] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const aiRequestControllerRef = useRef<AbortController | null>(null);

  const handleAskAiAssistant = async () => {
    aiRequestControllerRef.current?.abort();

    setAskAssistantClicked(true);
    setAiLoading(true);
    setAiFinished(false);
    setAiStreaming(true);
    setAiResponse('');

    const controller = new AbortController();
    let hasReceivedChunk = false;
    aiRequestControllerRef.current = controller;

    await sendMessageStream({
      prompt: prompt,
      ...(locale === undefined ? {} : { locale }),
      ...(currentPath === undefined ? {} : { currentPath }),
      signal: controller.signal,
      onChunk: (chunk) => {
        if (aiRequestControllerRef.current !== controller) {
          return;
        }

        hasReceivedChunk = true;
        setAiLoading(false);
        setAiResponse((prev) => prev + chunk);
      },
      onComplete: () => {
        if (aiRequestControllerRef.current !== controller) {
          return;
        }

        aiRequestControllerRef.current = null;
        setAiStreaming(false);

        if (!hasReceivedChunk) {
          setAiLoading(false);
        }
      },
      onError: (message) => {
        if (aiRequestControllerRef.current !== controller) {
          return;
        }

        aiRequestControllerRef.current = null;
        setAiStreaming(false);
        setAiLoading(false);
        setAiResponse((prev) =>
          prev
            ? `${prev}\n\n> ${message}`
            : message || 'AI 助手暫時不可用，請稍後再試。',
        );
      },
    });
  };

  const handleAiClose = useCallback(() => {
    aiRequestControllerRef.current?.abort();
    aiRequestControllerRef.current = null;
    setAskAssistantClicked(false);
    setAiResponse('');
    setAiFinished(false);
    setAiLoading(false);
    setAiStreaming(false);
  }, []);

  useEffect(
    () => () => {
      aiRequestControllerRef.current?.abort();
    },
    [],
  );
  return {
    askAssistantClicked,
    aiLoading,
    aiResponse,
    aiFinished,
    aiStreaming,
    handleAskAiAssistant,
    handleAiClose,
    finishAi: () => setAiFinished(true),
  };
};
