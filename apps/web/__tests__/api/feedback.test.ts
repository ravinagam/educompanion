import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeChain } from '../helpers/mock-supabase';

// Module-level mock state — captured by reference in vi.mock factory
const sb = { getUser: vi.fn(), from: vi.fn() };

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: sb.getUser }, from: sb.from }),
}));

// feedback route never uses admin client, but mock it to be safe
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: vi.fn() }),
}));

const MOCK_USER = { id: 'user-1', email: 'test@example.com' };

function makeRequest(body: object) {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/feedback/route');
    const res = await POST(makeRequest({ message: 'hello' }) as any);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 for empty message', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    sb.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { POST } = await import('@/app/api/feedback/route');
    const res = await POST(makeRequest({ message: '' }) as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Message required');
  });

  it('returns 400 for whitespace-only message', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });

    const { POST } = await import('@/app/api/feedback/route');
    const res = await POST(makeRequest({ message: '   ' }) as any);

    expect(res.status).toBe(400);
  });

  it('returns 200 on success with message only', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    sb.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { POST } = await import('@/app/api/feedback/route');
    const res = await POST(makeRequest({ message: 'Great app!' }) as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 200 on success with rating and category', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    sb.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { POST } = await import('@/app/api/feedback/route');
    const res = await POST(
      makeRequest({ message: 'Love the streak feature', rating: 5, category: 'love' }) as any,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 500 when Supabase insert fails', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    sb.from.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));

    const { POST } = await import('@/app/api/feedback/route');
    const res = await POST(makeRequest({ message: 'Bug report' }) as any);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('DB error');
  });
});
