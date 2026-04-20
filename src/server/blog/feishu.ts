import { Block, FileToken } from 'feishu-docx';

import { wait } from './utils';

const FEISHU_BASE_URL = 'https://open.feishu.cn/open-apis';
const DOC_PAGE_SIZE = 500;
const WIKI_PAGE_SIZE = 200;

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
  obj_edit_time?: string | number;
};

type FeishuGetNodeResponse = {
  code: number;
  msg: string;
  data?: {
    node: FeishuWikiNode;
  };
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

type FeishuDocumentResponse = {
  code: number;
  msg: string;
  data?: {
    document?: {
      document_id: string;
      title?: string;
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

const tokenCache = new Map<string, CachedToken>();

const parseApiError = async (response: Response) => {
  const text = await response.text();
  throw new Error(`Feishu API error ${response.status}: ${text}`);
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
  ) {
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
      await parseApiError(response);
    }

    return (await response.json()) as T;
  }

  async getNode(token: string) {
    const payload = await this.request<FeishuGetNodeResponse>(
      '/wiki/v2/spaces/get_node',
      { method: 'GET' },
      { token },
    );

    if (!payload.data?.node) {
      throw new Error(payload.msg || `Unable to resolve wiki node ${token}.`);
    }

    return payload.data.node;
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

  async listDocNodes(rootToken: string) {
    const root = await this.getNode(rootToken);
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
        await wait(120);
        await walk(child);
      }
    };

    await walk(root);

    return items;
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

    return blocks;
  }

  async downloadAsset(fileToken: FileToken) {
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
      await parseApiError(response);
    }

    return {
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type'),
      contentDisposition: response.headers.get('content-disposition'),
    };
  }
}
