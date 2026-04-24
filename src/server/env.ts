import { getPublicEnv } from '@/common/config/env';

const normalizeEnv = (value?: string | null) => value?.trim() || '';

const splitEnvList = (value?: string | null) =>
  normalizeEnv(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const getServerEnv = () => {
  const publicEnv = getPublicEnv();

  return {
    blobReadWriteToken: normalizeEnv(process.env.BLOB_READ_WRITE_TOKEN),
    contactFormApiKey: normalizeEnv(process.env.CONTACT_FORM_API_KEY),
    cronSecret: normalizeEnv(process.env.CRON_SECRET),
    devtoKey: normalizeEnv(process.env.DEVTO_KEY),
    feishu: {
      appId: normalizeEnv(process.env.FEISHU_APP_ID),
      appSecret: normalizeEnv(process.env.FEISHU_APP_SECRET),
      spaceId: normalizeEnv(process.env.FEISHU_SPACE_ID),
    },
    firebaseAdmin: {
      clientEmail: normalizeEnv(process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
      privateKey: normalizeEnv(process.env.FIREBASE_ADMIN_PRIVATE_KEY).replace(
        /\\n/g,
        '\n',
      ),
      projectId: normalizeEnv(process.env.FIREBASE_ADMIN_PROJECT_ID),
    },
    guestbookAdminUids: splitEnvList(process.env.GUESTBOOK_ADMIN_UIDS),
    githubTokens: {
      personal: normalizeEnv(process.env.GITHUB_READ_USER_TOKEN_PERSONAL),
    },
    isVercel: Boolean(process.env.VERCEL),
    minimax: {
      apiKey: normalizeEnv(process.env.MINIMAX_API_KEY),
      baseUrl:
        normalizeEnv(process.env.MINIMAX_BASE_URL).replace(/\/$/, '') ||
        'https://api.minimaxi.com/v1',
      model: normalizeEnv(process.env.MINIMAX_MODEL) || 'MiniMax-M2.7',
      systemPrompt:
        normalizeEnv(process.env.MINIMAX_SYSTEM_PROMPT) ||
        [
          'You are the AI assistant for this personal site.',
          'Answer briefly, clearly, and in the same language as the user.',
          'Prefer the provided site context over general knowledge.',
          'If the site context is insufficient, say so instead of guessing.',
          'Format responses in strict CommonMark for a small modal UI.',
          'Always put a space after heading markers, list markers, and blockquote markers.',
          'Prefer short paragraphs, concise bullet lists, and inline links.',
          'Do not use raw HTML, tables, or very long sections.',
        ].join(' '),
    },
    publicEnv,
    spotify: {
      clientId: normalizeEnv(process.env.SPOTIFY_CLIENT_ID),
      clientSecret: normalizeEnv(process.env.SPOTIFY_CLIENT_SECRET),
      refreshToken: normalizeEnv(process.env.SPOTIFY_REFRESH_TOKEN),
    },
    wakatimeApiKey: normalizeEnv(process.env.WAKATIME_API_KEY),
  };
};
