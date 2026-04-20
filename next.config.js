const nextConfig = {
  reactStrictMode: true,
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
