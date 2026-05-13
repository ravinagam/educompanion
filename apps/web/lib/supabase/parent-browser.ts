import { createBrowserClient } from '@supabase/ssr';

// Own singleton — opts out of Supabase's global cache (isSingleton: false) so the student
// client cached by createClient() is never returned here, while still only creating one instance.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createParentBrowserClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
      { cookieOptions: { name: 'sb-parent' }, isSingleton: false }
    );
  }
  return _client;
}
