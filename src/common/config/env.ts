const normalizeEnv = (value?: string | null) => value?.trim() || '';

const splitEnvList = (value?: string | null) =>
  normalizeEnv(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const getPublicEnv = () => {
  const siteUrl =
    normalizeEnv(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeEnv(process.env.SITE_URL) ||
    'http://localhost:3000';

  return {
    imageRemoteHosts: splitEnvList(process.env.IMAGE_REMOTE_HOSTS),
    siteUrl,
    firebase: {
      apiKey: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      appId: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
      authDomain: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      databaseUrl: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_DB_URL),
      guestbookPath: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_CHAT_DB),
      measurementId: normalizeEnv(
        process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      ),
      messagingSenderId: normalizeEnv(
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      ),
      projectId: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      storageBucket: normalizeEnv(
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      ),
    },
  };
};

export const hasFirebasePublicEnv = () => {
  const { firebase } = getPublicEnv();

  return [
    firebase.apiKey,
    firebase.appId,
    firebase.authDomain,
    firebase.databaseUrl,
    firebase.projectId,
  ].every(Boolean);
};
