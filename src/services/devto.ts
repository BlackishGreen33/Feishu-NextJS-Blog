import axios from 'axios';

import { SITE_DEVTO_USERNAME } from '@/common/config/site';
import { legacyCommentSchema } from '@/common/schemas/comments';
import { getServerEnv } from '@/server/env';

const COMMENT_URL = 'https://dev.to/api/comments';
const USERNAME = SITE_DEVTO_USERNAME;

export const getBlogComment = async ({ post_id }: { post_id: string }) => {
  if (!USERNAME) {
    return { status: 200, data: [] };
  }

  const response = await axios.get<unknown>(
    `${COMMENT_URL}/?${new URLSearchParams({ a_id: post_id }).toString()}`,
    {
      headers: {
        'api-key': getServerEnv().devtoKey,
      },
    },
  );

  const status = response?.status;

  if (status >= 400) {
    const empty: Record<string, never> = {};
    return { status, data: empty };
  }

  const data = legacyCommentSchema.array().parse(response.data);

  return {
    status,
    data,
  };
};
