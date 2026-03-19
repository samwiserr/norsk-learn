import { NextRequest, NextResponse } from 'next/server';
import { detectLocale } from '@/lib/i18n/detect-locale';
import { isValidLanguageCode } from '@/lib/languages';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Temporarily disabled locale redirect to prevent breaking existing routes
  // TODO: Enable when app/[locale] structure is implemented
  // For now, just set locale header for API routes to use
  const locale = detectLocale(request);
  const pathLocale = pathname.split('/').filter(Boolean)[0] ?? '';
  
  // If path already has valid locale, set header and continue
  if (isValidLanguageCode(pathLocale)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-locale', pathLocale);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // Set locale header for API routes (but don't redirect pages yet)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // TODO: Uncomment when locale-based routing is fully implemented
  // Redirect to locale-prefixed path
  // const newUrl = new URL(`/${locale}${pathname}`, request.url);
  // return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};


