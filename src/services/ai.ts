import axios from 'axios';

import { createSSEParser } from '@/common/libs/sse';
import {
  aiBrowserEventSchema,
  aiHttpResponseSchema,
  getAiResponseErrorMessage,
  parseAiJson,
} from '@/common/schemas/ai';

type SendMessageStreamInput = {
  currentPath?: string;
  locale?: string;
  onChunk: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (message: string) => void;
  prompt: string;
  signal?: AbortSignal;
};

export const sendMessage = async ({
  prompt,
  locale,
  currentPath,
}: {
  prompt: string;
  locale?: string;
  currentPath?: string;
}) => {
  try {
    const response = await axios.post<unknown>(
      '/api/chat',
      { prompt, locale, currentPath },
      { validateStatus: () => true },
    );

    const parsed = aiHttpResponseSchema.safeParse(response.data);
    if (response.status >= 400) {
      return (
        (parsed.success ? parsed.data.error || parsed.data.message : '') ||
        'AI 助手暫時不可用，請稍後再試。'
      );
    }

    return parsed.success ? parsed.data.reply || '' : '';
  } catch {
    return '';
  }
};

export const sendMessageStream = async ({
  prompt,
  locale,
  currentPath,
  signal,
  onChunk,
  onComplete,
  onError,
}: SendMessageStreamInput) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        prompt,
        locale,
        currentPath,
        stream: true,
      }),
      signal: signal ?? null,
    });

    if (!response.ok) {
      onError?.(
        await getAiResponseErrorMessage(
          response,
          'AI 助手暫時不可用，請稍後再試。',
        ),
      );
      return;
    }

    if (!response.body) {
      onError?.('AI 助手暫時不可用，請稍後再試。');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let shouldNotifyComplete = true;
    const parser = createSSEParser((event) => {
      if (!event.data || event.data === '[DONE]') {
        return;
      }

      const parsed = aiBrowserEventSchema.safeParse(parseAiJson(event.data));
      if (!parsed.success) return;
      const payload = parsed.data;

      if (payload.type === 'chunk' && payload.value) {
        onChunk(payload.value);
        return;
      }

      if (payload.type === 'error') {
        shouldNotifyComplete = false;
        onError?.(payload.message);
      }
    });

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        parser.feed(decoder.decode(value, { stream: true }));
      }

      parser.feed(decoder.decode());
      parser.flush();
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }

    if (shouldNotifyComplete) {
      onComplete?.();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }

    onError?.(
      error instanceof Error
        ? error.message
        : 'AI 助手暫時不可用，請稍後再試。',
    );
  }
};
