import { getServerEnv } from '@/server/env';

import { FeishuClient } from './feishu';

type FeishuSubscriptionClient = {
  listDocNodesBySpace: (
    spaceId: string,
  ) => Promise<Array<{ obj_token: string }>>;
  subscribeToDocumentEvents: (fileToken: string) => Promise<void>;
};

type CreateSubscriptionReconcilerOptions = {
  client: FeishuSubscriptionClient;
  spaceId: string;
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown subscription error';

export const createFeishuDocumentSubscriptionReconciler =
  ({ client, spaceId }: CreateSubscriptionReconcilerOptions) =>
  async () => {
    const documents = await client.listDocNodesBySpace(spaceId);
    const failures: Array<{ fileToken: string; message: string }> = [];
    let subscribedDocuments = 0;

    for (const document of documents) {
      try {
        await client.subscribeToDocumentEvents(document.obj_token);
        subscribedDocuments += 1;
      } catch (error) {
        failures.push({
          fileToken: document.obj_token,
          message: toErrorMessage(error),
        });
      }
    }

    return {
      totalDocuments: documents.length,
      subscribedDocuments,
      failedDocuments: failures.length,
      failures,
    };
  };

export const ensureFeishuDocumentEventSubscriptions = async () => {
  const {
    feishu: { appId, appSecret, spaceId },
  } = getServerEnv();

  if (!appId || !appSecret || !spaceId) {
    return {
      skipped: true as const,
      reason: 'Missing Feishu configuration',
    };
  }

  const result = await createFeishuDocumentSubscriptionReconciler({
    client: new FeishuClient(appId, appSecret),
    spaceId,
  })();

  if (result.failedDocuments > 0) {
    // Keep document tokens private while retaining enough detail to diagnose
    // missing Feishu permissions or subscription limits.
    console.error('Feishu document subscription failures', {
      failedDocuments: result.failedDocuments,
      messages: [
        ...new Set(result.failures.map(({ message }) => message)),
      ].slice(0, 3),
    });
  }

  return {
    totalDocuments: result.totalDocuments,
    subscribedDocuments: result.subscribedDocuments,
    failedDocuments: result.failedDocuments,
  };
};
