import axios from 'axios';

import { createSSEParser } from '@/common/libs/sse';
import {
  getAiErrorMessage,
  getAiResponseErrorMessage,
  type MiniMaxChatMessage,
  type MiniMaxConfig,
  miniMaxConfigSchema,
  type MiniMaxMessageContent,
  miniMaxResponseSchema,
  parseAiJson,
} from '@/common/schemas/ai';
import { getServerEnv } from '@/server/env';
export type { MiniMaxChatMessage } from '@/common/schemas/ai';

type ChatPromptInput = {
  prompt: string;
  context?: string;
  systemPrompt?: string;
};

type ChatStreamInput = ChatPromptInput & {
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
};

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

const buildMessages = (
  { prompt, context, systemPrompt }: ChatPromptInput,
  defaultSystemPrompt: string,
): MiniMaxChatMessage[] => {
  const mergedSystemPrompt = [systemPrompt || defaultSystemPrompt, context]
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
  const parsed = miniMaxResponseSchema.safeParse(payload);
  const nextContent = normalizeMessageContent(
    parsed.success ? parsed.data.choices?.[0]?.delta?.content : undefined,
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
  config: MiniMaxConfig,
) => {
  const response = await axios.post<unknown>(
    `${config.baseUrl}/chat/completions`,
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
        Authorization: `Bearer ${config.apiKey}`,
      },
      timeout: 30000,
      validateStatus: () => true,
    },
  );

  if (response.status >= 400) {
    return {
      status: response.status,
      message: getAiErrorMessage(
        response.data,
        response.statusText || 'MiniMax 請求失敗。',
      ),
    };
  }

  const parsed = miniMaxResponseSchema.safeParse(response.data);
  const reply = stripThinkingContent(
    normalizeMessageContent(
      parsed.success ? parsed.data.choices?.[0]?.message?.content : undefined,
    ),
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
  config: MiniMaxConfig,
) => {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
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
    signal: signal ?? null,
  });

  if (!response.ok) {
    return {
      status: response.status,
      message: await getAiResponseErrorMessage(
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

    const payload = parseAiJson(event.data);

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
    if (
      signal?.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      return {
        status: 499,
        message: '請求已取消。',
      };
    }

    throw error;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
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

export const postChatPrompt = async (input: ChatPromptInput) => {
  const config = getServerEnv().minimax;
  if (!config.apiKey) {
    return {
      status: 500,
      message: 'MiniMax API 未配置，請先設定 MINIMAX_API_KEY。',
    };
  }

  try {
    miniMaxConfigSchema.parse(config);
    const messages = buildMessages(input, config.systemPrompt);
    return await requestChatCompletion(config.model, messages, config);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status || 500,
        message: getAiErrorMessage(
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

export const streamChatPrompt = async (input: ChatStreamInput) => {
  const { signal } = input;
  const config = getServerEnv().minimax;
  if (!config.apiKey) {
    return {
      status: 500,
      message: 'MiniMax API 未配置，請先設定 MINIMAX_API_KEY。',
    };
  }

  try {
    miniMaxConfigSchema.parse(config);
    const messages = buildMessages(input, config.systemPrompt);
    return await requestChatCompletionStream(
      config.model,
      messages,
      input,
      config,
    );
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      return {
        status: 499,
        message: '請求已取消。',
      };
    }

    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status || 500,
        message: getAiErrorMessage(
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
