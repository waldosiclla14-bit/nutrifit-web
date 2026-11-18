import { NextResponse, type NextRequest } from 'next/server';
import { LEGACY_HOSTS, SITE_HOST } from '@/lib/site';

const SESSION_COOKIE = 'nf_session';
const PROTECTED = ['/admin', '/pos'];

/**
 * Construye la URL canónica para un host que no es el oficial.
 * Conserva pathname y query para no romper campañas ni enlaces entrantes.
 */
function canonicalUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.protocol = 'https:';
  url.host = SITE_HOST;
  url.port = '';
  return url;
}

/**
 * Proxy (antes `middleware`, renombrado en Next.js 16):
 * 1) 301 al dominio canónico desde el host antiguo de Vercel y desde `www.`
 *    (una sola versión principal: el apex HTTPS).
 * 2) Guard de sesión para /admin, /pos y /login + X-Robots-Tag noindex.
 * 3) noindex en despliegues de preview para que no compitan con producción.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rawHost = request.headers.get('host') ?? '';
  const host = rawHost.toLowerCase().replace(/:\d+$/, '');
  const isWww = host === `www.${SITE_HOST}`;

  // El apex con www y el host histórico de Vercel comparten la misma
  // equivalencia exacta: mismo pathname, mismo query, solo cambia el host.
  if (LEGACY_HOSTS.includes(host) || isWww) {
    return NextResponse.redirect(canonicalUrl(request), 301);
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
  // Los previews de Vercel no deben indexarse: solo producción se indexa.
  if (process.env.VERCEL_ENV === 'preview') {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png).*)'],
};
