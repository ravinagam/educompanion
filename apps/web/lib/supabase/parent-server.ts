import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Server client for parent portal — reads/writes separate cookies so parent and student sessions don't collide. */
export async function createParentServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: 'sb-parent' },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — handled by middleware
          }
        },
      },
    }
  );
}
