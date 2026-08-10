import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'nf_session';
const PROTECTED = ['/admin', '/pos'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === '/login';
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasSession = !!req.cookies.get(SESSION_COOKIE);
  const requestedNext = req.nextUrl.searchParams.get('next');
  const next = requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/admin';

  if (isLogin && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = next;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
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
  matcher: ['/admin/:path*', '/pos/:path*', '/login'],
};
