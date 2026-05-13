import { createBrowserClient } from '@supabase/ssr';

/** Browser client for parent portal — uses a separate cookie so it doesn't conflict with the student session. */
export function createParentBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    { cookieOptions: { name: 'sb-parent' } }
  );
}
