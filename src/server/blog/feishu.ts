import type { FileToken } from 'feishu-docx/dist/index.js';

import { normalizeFeishuBlocks } from './feishu-blocks';
import {
  FeishuApiErrorPayload,
  feishuApiErrorSchema,
  feishuBlockListSchema,
  feishuContactUserSchema,
  feishuDocumentSchema,
  feishuListNodesSchema,
  feishuNodeSchema,
  feishuTokenSchema,
  FeishuWikiNode,
} from './feishu-schema';
import { wait } from './utils';
export type { FeishuWikiNode } from './feishu-schema';

const FEISHU_BASE_URL = 'https://open.feishu.cn/open-apis';
const DOC_PAGE_SIZE = 500;
const WIKI_PAGE_SIZE = 50;

type CachedToken = { accessToken: string; expiresAt: number };

const tokenCache = new Map<string, CachedToken>();
const MAX_RATE_LIMIT_RETRIES = 2;

const buildFeishuPermissionHint = (
  payload: FeishuApiErrorPayload,
  status?: number,
) => {
  const message = payload.msg?.toLowerCase() || '';
  const isWikiPermissionDenied =
    payload.code === 131006 ||
    message.includes('wiki space permission denied') ||
    message.includes('tenant needs read permission');

  if (!isWikiPermissionDenied) {
    return null;
  }

  return [
    'Grant the app access to the target Feishu wiki space before syncing.',
    'Verify the app has `wiki:wiki:readonly` and `docx:document:readonly` permissions, has been published, and has been added to the knowledge base with read/admin access.',
    status ? `HTTP ${status}` : null,
  ]
    .filter(Boolean)
    .join(' ');
};

const isRateLimitPayload = (payload: FeishuApiErrorPayload, status?: number) =>
  status === 429 || /rate limit|too many requests/i.test(payload.msg || '');

const getRateLimitRetryDelay = (response?: Response, retryAttempt = 0) => {
  const retryAfter = response?.headers.get('retry-after');
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return 500 * (retryAttempt + 1);
};

export const formatFeishuApiErrorMessage = (
  payload: FeishuApiErrorPayload,
  options: { status?: number } = {},
) => {
  const baseParts = [
    options.status ? `Feishu API error ${options.status}` : 'Feishu API error',
    payload.code !== undefined ? `code=${payload.code}` : null,
    payload.msg || 'Unknown error',
  ].filter(Boolean);

  const suffixParts = [
    payload.error?.log_id ? `log_id=${payload.error.log_id}` : null,
    payload.error?.troubleshooter
      ? `troubleshooter=${payload.error.troubleshooter}`
      : null,
    buildFeishuPermissionHint(payload, options.status),
  ].filter(Boolean);

  return [baseParts.join(': '), suffixParts.join(' | ')]
    .filter(Boolean)
    .join(' | ');
};

const parseApiError = async (response: Response) => {
  const text = await response.text();

  try {
    const raw: unknown = JSON.parse(text);
    const parsed = feishuApiErrorSchema.safeParse(raw);
    if (!parsed.success)
      throw new Error(`Feishu API error ${response.status}: ${text}`);
    const payload = parsed.data;
    throw new Error(
      formatFeishuApiErrorMessage(payload, { status: response.status }),
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Feishu API error ${response.status}: ${text}`);
    }

    throw error;
  }
};

export class FeishuClient {
  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
  ) {}

  private get cacheKey() {
    return `${this.appId}:${this.appSecret}`;
  }

  async getTenantAccessToken() {
    const cached = tokenCache.get(this.cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60 * 1000) {
      return cached.accessToken;
    }

    const response = await fetch(
      `${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: this.appId,
          app_secret: this.appSecret,
        }),
      },
    );

    if (!response.ok) {
      await parseApiError(response);
    }

    const payload = feishuTokenSchema.parse(await response.json());

    if (!payload.tenant_access_token) {
      throw new Error(payload.msg || 'Unable to retrieve Feishu access token.');
    }

    if (payload.expire === undefined)
      throw new Error('Unable to retrieve Feishu token expiry.');

    tokenCache.set(this.cacheKey, {
      accessToken: payload.tenant_access_token,
      expiresAt: Date.now() + payload.expire * 1000,
    });

    return payload.tenant_access_token;
  }

  private async request<T>(
    input: string,
    parse: (value: unknown) => T,
    init: RequestInit = {},
    params?: Record<string, string | number | undefined>,
    retryAttempt = 0,
  ): Promise<T> {
    const accessToken = await this.getTenantAccessToken();
    const search = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      search.set(key, String(value));
    });

    const url = `${FEISHU_BASE_URL}${input}${
      search.size > 0 ? `?${search.toString()}` : ''
    }`;

    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      if (response.status === 429 && retryAttempt < MAX_RATE_LIMIT_RETRIES) {
        await wait(getRateLimitRetryDelay(response, retryAttempt));
        return this.request(input, parse, init, params, retryAttempt + 1);
      }

      await parseApiError(response);
    }

    const payload: unknown = await response.json();
    const errorPayload = feishuApiErrorSchema.parse(payload);
    if (errorPayload.code !== undefined && errorPayload.code !== 0) {
      if (
        isRateLimitPayload(errorPayload) &&
        retryAttempt < MAX_RATE_LIMIT_RETRIES
      ) {
        await wait(getRateLimitRetryDelay(undefined, retryAttempt));
        return this.request(input, parse, init, params, retryAttempt + 1);
      }
      throw new Error(formatFeishuApiErrorMessage(errorPayload));
    }
    return parse(payload);
  }

  private async getUserName(openId: string) {
    const payload = await this.request(
      `/contact/v3/users/${encodeURIComponent(openId)}`,
      feishuContactUserSchema.parse,
      { method: 'GET' },
      { user_id_type: 'open_id' },
    );

    return payload.data?.user?.name || null;
  }

  async listChildNodes(spaceId: string, parentNodeToken?: string) {
    const items: FeishuWikiNode[] = [];
    let pageToken: string | undefined;

    do {
      const payload = await this.request(
        `/wiki/v2/spaces/${spaceId}/nodes`,
        feishuListNodesSchema.parse,
        { method: 'GET' },
        {
          parent_node_token: parentNodeToken,
          page_size: WIKI_PAGE_SIZE,
          page_token: pageToken,
        },
      );

      items.push(...(payload.data?.items || []));
      pageToken = payload.data?.has_more ? payload.data.page_token : undefined;
    } while (pageToken);

    return items;
  }

  async listDocNodesBySpace(spaceId: string) {
    const items: FeishuWikiNode[] = [];

    const walk = async (node: FeishuWikiNode) => {
      if (node.obj_type === 'docx') {
        items.push(node);
      }

      if (!node.has_child) return;

      const children = await this.listChildNodes(
        node.space_id,
        node.node_token,
      );

      for (const child of children) {
        await walk(child);
      }
    };

    const rootChildren = await this.listChildNodes(spaceId);

    for (const child of rootChildren) {
      await walk(child);
    }

    return items;
  }

  async getNode(spaceId: string, nodeToken: string) {
    const payload = await this.request(
      `/wiki/v2/spaces/${spaceId}/nodes/${nodeToken}`,
      feishuNodeSchema.parse,
      { method: 'GET' },
    );

    return payload.data?.node || null;
  }

  async getDocumentInfo(documentId: string) {
    const payload = await this.request(
      `/docx/v1/documents/${documentId}`,
      feishuDocumentSchema.parse,
      { method: 'GET' },
    );

    return payload.data?.document || null;
  }

  async subscribeToDocumentEvents(documentId: string) {
    await this.request(
      `/drive/v1/files/${encodeURIComponent(documentId)}/subscribe`,
      feishuApiErrorSchema.parse,
      { method: 'POST' },
      { file_type: 'docx' },
    );
  }

  async getDocumentBlocks(documentId: string) {
    const blocks: import('./feishu-schema').FeishuBlockInput[] = [];
    let pageToken: string | undefined;

    do {
      const payload = await this.request(
        `/docx/v1/documents/${documentId}/blocks`,
        feishuBlockListSchema.parse,
        { method: 'GET' },
        {
          document_revision_id: -1,
          page_size: DOC_PAGE_SIZE,
          page_token: pageToken,
        },
      );

      blocks.push(...(payload.data?.items || []));
      pageToken = payload.data?.has_more ? payload.data.page_token : undefined;
    } while (pageToken);

    return normalizeFeishuBlocks(blocks, (openId) => this.getUserName(openId));
  }

  async downloadAsset(
    fileToken: FileToken,
    retryAttempt = 0,
  ): Promise<{
    body: Buffer;
    contentType: string | null;
    contentDisposition: string | null;
  }> {
    const accessToken = await this.getTenantAccessToken();
    const endpoint =
      fileToken.type === 'board'
        ? `${FEISHU_BASE_URL}/board/v1/whiteboards/${fileToken.token}/download_as_image`
        : `${FEISHU_BASE_URL}/drive/v1/medias/${fileToken.token}/download`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 429 && retryAttempt < MAX_RATE_LIMIT_RETRIES) {
        await wait(getRateLimitRetryDelay(response, retryAttempt));
        return this.downloadAsset(fileToken, retryAttempt + 1);
      }

      await parseApiError(response);
    }

    return {
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type'),
      contentDisposition: response.headers.get('content-disposition'),
    };
  }
}
