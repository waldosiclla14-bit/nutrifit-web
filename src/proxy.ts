import { NextResponse, type NextRequest } from 'next/server';
import { LEGACY_HOSTS, SITE_HOST } from '@/lib/site';

const SESSION_COOKIE = 'nf_session';
const PROTECTED = ['/admin', '/pos'];

/**
 * Proxy (antes `middleware`, renombrado en Next.js 16):
 * 1) Redirección permanente 301 del host antiguo de Vercel al dominio canónico.
 * 2) Guard de sesión para /admin, /pos y /login + X-Robots-Tag noindex.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rawHost = request.headers.get('host') ?? '';
  const host = rawHost.toLowerCase().replace(/:\d+$/, '');
  if (LEGACY_HOSTS.includes(host)) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = SITE_HOST;
    return NextResponse.redirect(url, 301);
  }

  const isLogin = pathname === '/login';
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const hasSession = !!request.cookies.get(SESSION_COOKIE);
  const requestedNext = request.nextUrl.searchParams.get('next');
  const next =
    requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/admin';

  if (isLogin && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = next;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (isProtected || isLogin) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png).*)'],
};
