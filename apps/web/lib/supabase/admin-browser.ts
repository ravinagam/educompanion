import { createBrowserClient } from '@supabase/ssr';

const PREFIX = 'adm_';

function parseCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined') return [];
  return document.cookie
    .split(';')
    .map(c => {
      const i = c.indexOf('=');
      return { name: c.slice(0, i).trim(), value: c.slice(i + 1).trim() };
    })
    .filter(c => c.name);
}

export function createAdminBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return parseCookies()
            .filter(c => c.name.startsWith(PREFIX))
            .map(c => ({ name: c.name.slice(PREFIX.length), value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const parts = [`${PREFIX}${name}=${value}`, 'path=/'];
            if (options?.maxAge != null) parts.push(`max-age=${options.maxAge}`);
            if (options?.sameSite) parts.push(`SameSite=${String(options.sameSite)}`);
            document.cookie = parts.join('; ');
          });
        },
      },
    }
  );
}
