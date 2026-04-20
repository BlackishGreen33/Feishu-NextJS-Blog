import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['zh-TW', 'zh-CN', 'en'] as const;
const DEFAULT_LOCALE = 'zh-TW';

const PUBLIC_FILE = /\.(.*)$/;

const hasLocalePrefix = (pathname: string) =>
  SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

const normalizePreferredLocale = (value?: string | null) => {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const normalized = value.toLowerCase();

  if (normalized.startsWith('zh-cn') || normalized.startsWith('zh-hans')) {
    return 'zh-CN';
  }

  if (
    normalized.startsWith('zh-tw') ||
    normalized.startsWith('zh-hk') ||
    normalized.startsWith('zh-mo') ||
    normalized.startsWith('zh-hant')
  ) {
    return 'zh-TW';
  }

  if (normalized.startsWith('en')) {
    return 'en';
  }

  return DEFAULT_LOCALE;
};

const getPreferredLocale = (request: NextRequest) => {
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;

  if (localeCookie) {
    return normalizePreferredLocale(localeCookie);
  }

  const acceptLanguage = request.headers.get('accept-language');
  const firstLanguage = acceptLanguage?.split(',')[0];

  return normalizePreferredLocale(firstLanguage);
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    PUBLIC_FILE.test(pathname) ||
    hasLocalePrefix(pathname)
  ) {
    return NextResponse.next();
  }

  const preferredLocale = getPreferredLocale(request);

  if (preferredLocale === DEFAULT_LOCALE) {
    return NextResponse.next();
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname =
    pathname === '/' ? `/${preferredLocale}` : `/${preferredLocale}${pathname}`;

  return NextResponse.redirect(nextUrl);
}

export const config = {
  matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
