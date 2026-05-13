import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes that bypass all session checks
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/parent-login') ||
    pathname.startsWith('/how-to-use') ||
    pathname === '/'
  ) {
    return NextResponse.next({ request });
  }

  const isParentRoute = pathname.startsWith('/parent');

  // ── Parent routes: read sb-parent cookie ──────────────────────────────────
  if (isParentRoute) {
    let parentResponse = NextResponse.next({ request });

    const parentSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: { name: 'sb-parent' },
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            parentResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              parentResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user: parentUser } } = await parentSupabase.auth.getUser();

    if (!parentUser) {
      const url = request.nextUrl.clone();
      url.pathname = '/parent-login';
      return NextResponse.redirect(url);
    }

    return parentResponse;
  }

  // ── Student routes: read default sb-* cookie ──────────────────────────────
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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthRoute = pathname.startsWith('/auth');

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)',
  ],
};
