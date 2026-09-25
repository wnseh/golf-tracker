import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  // Edge 런타임: Sentry 자동 계측이 안 되고 번들 크기도 있어 console만 (Vercel Edge 로그). 미로그인은 정상 케이스.
  if (error && error.name !== 'AuthSessionMissingError') {
    console.error('[golf-tracker]', 'middleware.getUser', { name: error.name, message: error.message, status: error.status, pathname: request.nextUrl.pathname });
  }

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');

  // Unauthenticated user trying to access protected route
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated user trying to access auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // PWA 파일(manifest, sw.js, 아이콘)은 로그인 없이 받아야 한다 — 브라우저가 쿠키 없이 가져간다
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
