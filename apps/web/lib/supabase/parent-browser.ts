import { createBrowserClient } from '@supabase/ssr';

/** Browser client for parent portal — uses a separate cookie and opts out of the singleton
 *  so it never shares state with the student client cached by createClient(). */
export function createParentBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    { cookieOptions: { name: 'sb-parent' }, isSingleton: false }
  );
}
