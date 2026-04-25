import type { Block, FileToken } from 'feishu-docx/dist/index.js';

import { wait } from './utils';

const FEISHU_BASE_URL = 'https://open.feishu.cn/open-apis';
const DOC_PAGE_SIZE = 500;
const WIKI_PAGE_SIZE = 50;

type FeishuTokenResponse = {
  tenant_access_token: string;
  expire: number;
  code?: number;
  msg?: string;
};

export type FeishuWikiNode = {
  title: string;
  node_token: string;
  parent_node_token?: string;
  has_child?: boolean;
  space_id: string;
  obj_type: string;
  obj_token: string;
  obj_create_time?: string | number;
  obj_edit_time?: string | number;
};

type FeishuListNodesResponse = {
  code: number;
  msg: string;
  data?: {
    items: FeishuWikiNode[];
    has_more?: boolean;
    page_token?: string;
  };
};

type FeishuNodeResponse = {
  code: number;
  msg: string;
  data?: {
    node?: FeishuWikiNode;
  };
};

type FeishuDocumentResponse = {
  code: number;
  msg: string;
  data?: {
    document?: {
      document_id: string;
      title?: string;
      revision_id?: string | number;
      latest_revision_id?: string | number;
      cover?: {
        token?: string;
        offset_ratio_x?: number;
        offset_ratio_y?: number;
      };
    };
  };
};

type FeishuBlockListResponse = {
  code: number;
  msg: string;
  data?: {
    items: Block[];
    has_more?: boolean;
    page_token?: string;
  };
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

type FeishuApiErrorDetail = {
  log_id?: string;
  troubleshooter?: string;
};

type FeishuApiErrorPayload = {
  code?: number;
  msg?: string;
  error?: FeishuApiErrorDetail;
};

type FeishuTextStyle = {
  bold?: boolean;
  inline_code?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  text_color?: number;
  link?: {
    url: string;
  };
};

type FeishuTextElement = {
  text_run?: {
    content?: string;
    text_element_style?: FeishuTextStyle;
  };
  mention_doc?: {
    title: string;
    token: string;
    url?: string;
  };
  mention_user?: {
    user_id: string;
    text_element_style?: FeishuTextStyle;
  };
  reminder?: {
    expire_time?: string;
    notify_time?: string;
    text_element_style?: FeishuTextStyle;
  };
};

type FeishuTextBlockLike = {
  elements?: FeishuTextElement[];
};

type FeishuContactUserResponse = {
  data?: {
    user?: {
      name?: string;
    };
  };
};

type FeishuBlockLike = Block & {
  block_type: number;
  source_synced?: Record<string, unknown>;
  text?: FeishuTextBlockLike;
  heading1?: FeishuTextBlockLike;
  heading2?: FeishuTextBlockLike;
  heading3?: FeishuTextBlockLike;
  heading4?: FeishuTextBlockLike;
  heading5?: FeishuTextBlockLike;
  heading6?: FeishuTextBlockLike;
  heading7?: FeishuTextBlockLike;
  heading8?: FeishuTextBlockLike;
  heading9?: FeishuTextBlockLike;
  quote?: FeishuTextBlockLike;
  ordered?: FeishuTextBlockLike;
  bullet?: FeishuTextBlockLike;
  todo?: FeishuTextBlockLike;
};

const tokenCache = new Map<string, CachedToken>();
const SOURCE_SYNCED_BLOCK_TYPE = 49;
const SYNCED_BLOCK_TYPE = 999;
const MAX_RATE_LIMIT_RETRIES = 2;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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
    const payload = JSON.parse(text) as FeishuApiErrorPayload;
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

const getTextContainers = (block: FeishuBlockLike): FeishuTextBlockLike[] =>
  [
    block.text,
    block.heading1,
    block.heading2,
    block.heading3,
    block.heading4,
    block.heading5,
    block.heading6,
    block.heading7,
    block.heading8,
    block.heading9,
    block.quote,
    block.ordered,
    block.bullet,
    block.todo,
  ].filter(Boolean) as FeishuTextBlockLike[];

const formatReminderText = (timestamp?: string) => {
  if (!timestamp) {
    return ' 截止提醒';
  }

  const date = new Date(Number(timestamp));

  if (Number.isNaN(date.getTime())) {
    return ' 截止提醒';
  }

  return ` ${date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  })}`;
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

    const payload = (await response.json()) as FeishuTokenResponse;

    if (!payload.tenant_access_token) {
      throw new Error(payload.msg || 'Unable to retrieve Feishu access token.');
    }

    tokenCache.set(this.cacheKey, {
      accessToken: payload.tenant_access_token,
      expiresAt: Date.now() + payload.expire * 1000,
    });

    return payload.tenant_access_token;
  }

  private async request<T>(
    input: string,
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
        return this.request<T>(input, init, params, retryAttempt + 1);
      }

      await parseApiError(response);
    }

    const payload = (await response.json()) as T;

    if (
      isRecord(payload) &&
      typeof payload.code === 'number' &&
      payload.code !== 0
    ) {
      if (
        isRateLimitPayload(payload as FeishuApiErrorPayload) &&
        retryAttempt < MAX_RATE_LIMIT_RETRIES
      ) {
        await wait(getRateLimitRetryDelay(undefined, retryAttempt));
        return this.request<T>(input, init, params, retryAttempt + 1);
      }

      throw new Error(
        formatFeishuApiErrorMessage(payload as FeishuApiErrorPayload),
      );
    }

    return payload;
  }

  private async getUserName(openId: string) {
    const payload = await this.request<FeishuContactUserResponse>(
      `/contact/v3/users/${encodeURIComponent(openId)}`,
      { method: 'GET' },
      { user_id_type: 'open_id' },
    );

    return payload.data?.user?.name || null;
  }

  private async resolveUserNames(blocks: FeishuBlockLike[]) {
    const openIds = new Set<string>();

    blocks.forEach((block) => {
      getTextContainers(block).forEach((container) => {
        container.elements?.forEach((element) => {
          if (element.mention_user?.user_id) {
            openIds.add(element.mention_user.user_id);
          }
        });
      });
    });

    if (openIds.size === 0) {
      return new Map<string, string>();
    }

    const resolved = new Map<string, string>();

    try {
      for (const openId of openIds) {
        const name = await this.getUserName(openId);

        if (name) {
          resolved.set(openId, name);
        }
      }
    } catch (_error) {
      return resolved;
    }

    return resolved;
  }

  private normalizeElement(
    element: FeishuTextElement,
    userNames: Map<string, string>,
  ): FeishuTextElement {
    if (element.mention_user) {
      return {
        text_run: {
          content: `@${userNames.get(element.mention_user.user_id) || '成员'}`,
          text_element_style: element.mention_user.text_element_style,
        },
      };
    }

    if (element.reminder) {
      return {
        text_run: {
          content: formatReminderText(
            element.reminder.expire_time || element.reminder.notify_time,
          ),
          text_element_style: element.reminder.text_element_style,
        },
      };
    }

    return element;
  }

  private async normalizeBlocks(blocks: Block[]) {
    const typedBlocks = blocks as FeishuBlockLike[];
    const userNames = await this.resolveUserNames(typedBlocks);

    return typedBlocks.map((block) => {
      const normalized: FeishuBlockLike = { ...block };

      if (
        Number(normalized.block_type) === SOURCE_SYNCED_BLOCK_TYPE &&
        normalized.source_synced
      ) {
        normalized.block_type = SYNCED_BLOCK_TYPE;
      }

      (
        [
          'text',
          'heading1',
          'heading2',
          'heading3',
          'heading4',
          'heading5',
          'heading6',
          'heading7',
          'heading8',
          'heading9',
          'quote',
          'ordered',
          'bullet',
          'todo',
        ] as const
      ).forEach((key) => {
        const container = normalized[key];
        const normalizedRecord = normalized as unknown as Record<
          string,
          FeishuTextBlockLike
        >;

        if (!container?.elements) {
          return;
        }

        normalizedRecord[key] = {
          ...container,
          elements: container.elements.map((element) =>
            this.normalizeElement(element, userNames),
          ),
        };
      });

      return normalized as Block;
    });
  }

  async listChildNodes(spaceId: string, parentNodeToken?: string) {
    const items: FeishuWikiNode[] = [];
    let pageToken: string | undefined;

    do {
      const payload = await this.request<FeishuListNodesResponse>(
        `/wiki/v2/spaces/${spaceId}/nodes`,
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
    const payload = await this.request<FeishuNodeResponse>(
      `/wiki/v2/spaces/${spaceId}/nodes/${nodeToken}`,
      { method: 'GET' },
    );

    return payload.data?.node || null;
  }

  async getDocumentInfo(documentId: string) {
    const payload = await this.request<FeishuDocumentResponse>(
      `/docx/v1/documents/${documentId}`,
      { method: 'GET' },
    );

    return payload.data?.document || null;
  }

  async getDocumentBlocks(documentId: string) {
    const blocks: Block[] = [];
    let pageToken: string | undefined;

    do {
      const payload = await this.request<FeishuBlockListResponse>(
        `/docx/v1/documents/${documentId}/blocks`,
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

    return this.normalizeBlocks(blocks);
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
