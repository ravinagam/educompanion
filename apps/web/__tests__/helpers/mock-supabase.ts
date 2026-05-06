import { vi } from 'vitest';

export type MockResult = { data?: unknown; error?: { message: string } | null };

/** Returns a chainable Supabase query builder that resolves to `result`. */
export function makeChain(result: MockResult = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'insert', 'update', 'delete', 'upsert', 'in']) {
    chain[m] = () => chain;
  }
  chain['single'] = () => Promise.resolve(result);
  // Make the chain itself awaitable (for queries without .single())
  chain['then'] = (res: (v: MockResult) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return chain;
}

/** Supabase client mock with configurable auth + from. */
export function makeClientMock() {
  return {
    getUser: vi.fn(),
    from: vi.fn(),
  };
}

/** Admin client mock with configurable from. */
export function makeAdminMock() {
  return {
    from: vi.fn(),
  };
}
