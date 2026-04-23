import axios from 'axios';

import { createSSEParser } from '@/common/libs/sse';

const MINIMAX_BASE_URL =
  process.env.MINIMAX_BASE_URL?.replace(/\/$/, '') ||
  'https://api.minimaxi.com/v1';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';
const MINIMAX_SYSTEM_PROMPT =
  process.env.MINIMAX_SYSTEM_PROMPT ||
  [
    'You are the AI assistant for this personal site.',
    'Answer briefly, clearly, and in the same language as the user.',
    'Prefer the provided site context over general knowledge.',
    'If the site context is insufficient, say so instead of guessing.',
    'Format responses in strict CommonMark for a small modal UI.',
    'Always put a space after heading markers, list markers, and blockquote markers.',
    'Prefer short paragraphs, concise bullet lists, and inline links.',
    'Do not use raw HTML, tables, or very long sections.',
  ].join(' ');

export type MiniMaxChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatPromptInput = {
  prompt: string;
  context?: string;
  systemPrompt?: string;
};

type ChatStreamInput = ChatPromptInput & {
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
};

type SendMessageStreamInput = {
  currentPath?: string;
  locale?: string;
  onChunk: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (message: string) => void;
  prompt: string;
  signal?: AbortSignal;
};

type MiniMaxMessageContent =
  | string
  | Array<{
      type?: string;
      text?: string;
    }>;

const normalizeMessageContent = (
  content: MiniMaxMessageContent | undefined,
) => {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((item) =>
      item?.type === 'text' || item?.text ? item?.text || '' : '',
    )
    .join('')
    .trim();
};

const stripThinkingContent = (value: string) =>
  value.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

const safeParseJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch (_error) {
    return null;
  }
};

const getErrorMessage = (data: unknown, fallback: string) => {
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    data.error &&
    typeof data.error === 'object' &&
    'message' in data.error &&
    typeof data.error.message === 'string'
  ) {
    return data.error.message;
  }

  if (
    data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message;
  }

  return fallback;
};

const getResponseErrorMessage = async (
  response: Response,
  fallback: string,
) => {
  const text = await response.text();
  const parsedText = text.trim();

  if (!parsedText) {
    return fallback;
  }

  const parsedJson = safeParseJson<unknown>(parsedText);
  return getErrorMessage(parsedJson || parsedText, fallback);
};

const buildMessages = ({
  prompt,
  context,
  systemPrompt,
}: ChatPromptInput): MiniMaxChatMessage[] => {
  const mergedSystemPrompt = [systemPrompt || MINIMAX_SYSTEM_PROMPT, context]
    .filter(Boolean)
    .join('\n\n');

  const messages: MiniMaxChatMessage[] = [
    {
      role: 'system',
      content: mergedSystemPrompt,
    },
  ];

  messages.push({
    role: 'user',
    content: prompt.trim(),
  });

  return messages;
};

const extractStreamTextDelta = (payload: unknown, previousContent: string) => {
  const nextContent = normalizeMessageContent(
    (
      payload as {
        choices?: Array<{ delta?: { content?: MiniMaxMessageContent } }>;
      }
    )?.choices?.[0]?.delta?.content,
  );

  if (!nextContent) {
    return {
      nextContent: previousContent,
      delta: '',
    };
  }

  if (!previousContent) {
    return {
      nextContent,
      delta: stripThinkingContent(nextContent),
    };
  }

  if (nextContent.startsWith(previousContent)) {
    return {
      nextContent,
      delta: stripThinkingContent(nextContent.slice(previousContent.length)),
    };
  }

  return {
    nextContent,
    delta: stripThinkingContent(nextContent),
  };
};

const requestChatCompletion = async (
  model: string,
  messages: MiniMaxChatMessage[],
) => {
  const response = await axios.post(
    `${MINIMAX_BASE_URL}/chat/completions`,
    {
      model,
      messages,
      temperature: 0.7,
      max_completion_tokens: 1024,
      n: 1,
      reasoning_split: true,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MINIMAX_API_KEY}`,
      },
      timeout: 30000,
      validateStatus: () => true,
    },
  );

  if (response.status >= 400) {
    return {
      status: response.status,
      message: getErrorMessage(
        response.data,
        response.statusText || 'MiniMax 請求失敗。',
      ),
    };
  }

  const reply = stripThinkingContent(
    normalizeMessageContent(response.data?.choices?.[0]?.message?.content),
  );

  if (!reply) {
    return {
      status: 502,
      message: 'MiniMax 已返回成功響應，但沒有可顯示的內容。',
    };
  }

  return {
    status: response.status,
    data: {
      reply,
      model,
    },
  };
};

const requestChatCompletionStream = async (
  model: string,
  messages: MiniMaxChatMessage[],
  { onChunk, signal }: ChatStreamInput,
) => {
  const response = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_completion_tokens: 1024,
      n: 1,
      reasoning_split: true,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    return {
      status: response.status,
      message: await getResponseErrorMessage(
        response,
        'MiniMax 流式請求失敗。',
      ),
    };
  }

  if (!response.body) {
    return {
      status: 502,
      message: 'MiniMax 未返回可讀取的流式內容。',
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSSEParser((event) => {
    if (!event.data || event.data === '[DONE]') {
      return;
    }

    const payload = safeParseJson<unknown>(event.data);

    if (!payload) {
      return;
    }

    const { delta, nextContent } = extractStreamTextDelta(
      payload,
      streamedContent,
    );
    streamedContent = nextContent;

    if (delta) {
      fullReply += delta;
      onChunk(delta);
    }
  });

  let streamedContent = '';
  let fullReply = '';

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
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        status: 499,
        message: '請求已取消。',
      };
    }

    throw error;
  }

  if (!fullReply.trim()) {
    return {
      status: 502,
      message: 'MiniMax 已返回成功響應，但沒有可顯示的內容。',
    };
  }

  return {
    status: 200,
    data: {
      reply: fullReply,
      model,
    },
  };
};

export const postChatPrompt = async ({
  prompt,
  context,
  systemPrompt,
}: ChatPromptInput) => {
  if (!MINIMAX_API_KEY) {
    return {
      status: 500,
      message: 'MiniMax API 未配置，請先設定 MINIMAX_API_KEY。',
    };
  }

  try {
    const messages = buildMessages({ prompt, context, systemPrompt });
    return requestChatCompletion(MINIMAX_MODEL, messages);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status || 500,
        message: getErrorMessage(
          error.response?.data,
          error.message || 'MiniMax 請求失敗。',
        ),
      };
    }

    return {
      status: 500,
      message: error instanceof Error ? error.message : 'MiniMax 請求失敗。',
    };
  }
};

export const streamChatPrompt = async ({
  prompt,
  context,
  systemPrompt,
  onChunk,
  signal,
}: ChatStreamInput) => {
  if (!MINIMAX_API_KEY) {
    return {
      status: 500,
      message: 'MiniMax API 未配置，請先設定 MINIMAX_API_KEY。',
    };
  }

  try {
    const messages = buildMessages({ prompt, context, systemPrompt });
    return requestChatCompletionStream(MINIMAX_MODEL, messages, {
      prompt,
      context,
      systemPrompt,
      onChunk,
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        status: 499,
        message: '請求已取消。',
      };
    }

    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status || 500,
        message: getErrorMessage(
          error.response?.data,
          error.message || 'MiniMax 流式請求失敗。',
        ),
      };
    }

    return {
      status: 500,
      message:
        error instanceof Error ? error.message : 'MiniMax 流式請求失敗。',
    };
  }
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
    const response = await axios.post(
      '/api/chat',
      { prompt, locale, currentPath },
      { validateStatus: () => true },
    );

    if (response.status >= 400) {
      return (
        response.data?.error ||
        response.data?.message ||
        'AI 助手暫時不可用，請稍後再試。'
      );
    }

    return response.data?.reply || '';
  } catch (_error) {
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
      signal,
    });

    if (!response.ok) {
      onError?.(
        await getResponseErrorMessage(
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

      const payload = safeParseJson<
        | { type: 'chunk'; value: string }
        | { type: 'done' }
        | { type: 'error'; message: string }
      >(event.data);

      if (!payload) {
        return;
      }

      if (payload.type === 'chunk' && payload.value) {
        onChunk(payload.value);
        return;
      }

      if (payload.type === 'error') {
        shouldNotifyComplete = false;
        onError?.(payload.message);
      }
    });

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      parser.feed(decoder.decode(value, { stream: true }));
    }

    parser.feed(decoder.decode());
    parser.flush();

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
