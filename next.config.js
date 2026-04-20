const nextConfig = {
  reactStrictMode: true,
  // Pages Router API routes rely on feishu-docx at runtime; bundle server deps
  // to avoid Vercel/Turbopack externalization breaking the cron function.
  bundlePagesRouterDependencies: true,
  turbopack: {
    resolveAlias: {
      // feishu-docx publishes a broken "module" entry that points at TS source.
      // Force Turbopack to resolve the compiled CJS entry instead.
      'feishu-docx': 'feishu-docx/dist/index.js',
    },
  },
  i18n: {
    locales: ['zh-TW', 'zh-CN', 'en'],
    defaultLocale: 'zh-TW',
    localeDetection: false,
  },
  images: {
    localPatterns: [
      {
        pathname: '/feishu-assets/**',
      },
      {
        pathname: '/images/**',
      },
      {
        pathname: '/api/logo',
        search: '?key=xyzq',
      },
      {
        pathname: '/api/logo',
        search: '?key=ccnu',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
