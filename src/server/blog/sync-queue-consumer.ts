import { type FeishuSyncWakeup, feishuSyncWakeupSchema } from './sync-trigger';

const MAX_QUEUE_DELIVERIES = 10;
const MAX_RETRY_DELAY_SECONDS = 3600;

export const parseFeishuSyncWakeup = (
  value: unknown,
): FeishuSyncWakeup | null => {
  const result = feishuSyncWakeupSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const createFeishuSyncQueueConsumer =
  (processWakeup: (message: FeishuSyncWakeup) => Promise<unknown>) =>
  async (value: unknown) => {
    const message = parseFeishuSyncWakeup(value);

    if (!message) {
      console.warn('Ignoring invalid Feishu sync queue payload');
      return;
    }

    await processWakeup(message);
  };

export const getFeishuSyncQueueRetryDirective = ({
  deliveryCount,
}: {
  deliveryCount: number;
}) => {
  if (deliveryCount >= MAX_QUEUE_DELIVERIES) {
    return { acknowledge: true as const };
  }

  const exponent = Math.max(0, Math.floor(deliveryCount) - 1);
  return {
    afterSeconds: Math.min(MAX_RETRY_DELAY_SECONDS, 60 * 2 ** exponent),
  };
};

type RetryExhaustionLog = (
  message: string,
  context: { deliveryCount: number; errorType: string },
) => void;

const logRetryExhaustion: RetryExhaustionLog = (message, context) => {
  console.error(message, context);
};

export const createFeishuSyncQueueRetryHandler =
  (log: RetryExhaustionLog = logRetryExhaustion) =>
  (error: unknown, metadata: { deliveryCount: number }) => {
    const directive = getFeishuSyncQueueRetryDirective(metadata);

    if ('acknowledge' in directive) {
      log('Feishu sync queue retries exhausted', {
        deliveryCount: metadata.deliveryCount,
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }

    return directive;
  };
