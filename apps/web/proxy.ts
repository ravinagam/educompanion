import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { pathname } = request.nextUrl;

  // Routes that bypass session checks entirely
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/parent-login') ||
    pathname === '/'
  ) {
    return supabaseResponse;
  }

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
  const isParent = user?.user_metadata?.role === 'parent';
  const isParentRoute = pathname.startsWith('/parent');
  const isAuthRoute = pathname.startsWith('/auth');

  // Parent user trying to access student routes → send to parent dashboard
  if (user && isParent && !isParentRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/parent';
    return NextResponse.redirect(url);
  }

  // Unauthenticated or non-parent user trying to access parent routes → parent login
  if (isParentRoute) {
    if (!user || !isParent) {
      const url = request.nextUrl.clone();
      url.pathname = '/parent-login';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Student auth flow
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
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
