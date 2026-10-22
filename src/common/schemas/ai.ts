import { z } from 'zod';

export const aiPromptSchema = z.looseObject({
  prompt: z.string().refine((value) => Boolean(value.trim())),
  locale: z
    .unknown()
    .optional()
    .transform((value) => (typeof value === 'string' ? value : undefined)),
  currentPath: z
    .unknown()
    .optional()
    .transform((value) => (typeof value === 'string' ? value : undefined)),
  stream: z.unknown().optional(),
});
export const miniMaxConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url(),
  model: z.string(),
  systemPrompt: z.string(),
});
export type MiniMaxConfig = z.infer<typeof miniMaxConfigSchema>;
export const aiChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});
export type MiniMaxChatMessage = z.infer<typeof aiChatMessageSchema>;
const miniMaxContentSchema = z.union([
  z.string(),
  z.array(
    z
      .looseObject({ type: z.string().optional(), text: z.string().optional() })
      .nullable(),
  ),
]);
export type MiniMaxMessageContent = z.infer<typeof miniMaxContentSchema>;
export const miniMaxResponseSchema = z.looseObject({
  choices: z
    .array(
      z.looseObject({
        delta: z
          .looseObject({ content: miniMaxContentSchema.optional() })
          .optional(),
        message: z
          .looseObject({ content: miniMaxContentSchema.optional() })
          .optional(),
      }),
    )
    .optional(),
});
export const aiBrowserEventSchema = z.union([
  z.looseObject({ type: z.literal('chunk'), value: z.string() }),
  z.looseObject({ type: z.literal('done') }),
  z.looseObject({ type: z.literal('error'), message: z.string() }),
]);
export const aiHttpResponseSchema = z.looseObject({
  reply: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const parseAiJson = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

export const getAiErrorMessage = (data: unknown, fallback: string) => {
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

export const getAiResponseErrorMessage = async (
  response: Response,
  fallback: string,
) => {
  const text = await response.text();
  const parsedText = text.trim();

  if (!parsedText) {
    return fallback;
  }

  const parsedJson = parseAiJson(parsedText);
  return getAiErrorMessage(parsedJson || parsedText, fallback);
};
