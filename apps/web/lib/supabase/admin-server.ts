import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const PREFIX = 'adm_';

export async function createAdminSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore
            .getAll()
            .filter(c => c.name.startsWith(PREFIX))
            .map(c => ({ name: c.name.slice(PREFIX.length), value: c.value }));
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(PREFIX + name, value, options)
            );
          } catch {
            // Server component — cookie writes handled by middleware
          }
        },
      },
    }
  );
}
