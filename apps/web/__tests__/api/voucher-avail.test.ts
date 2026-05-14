import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeChain } from '../helpers/mock-supabase';

const sb = { getUser: vi.fn() };
const admin = { from: vi.fn() };

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: sb.getUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: admin.from }),
}));

const MOCK_USER = { id: 'student-1' };

function makeRequest(body: object) {
  return new Request('http://localhost/api/student/milestones/avail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/student/milestones/avail', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authenticated', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/student/milestones/avail/route');
    const res = await POST(makeRequest({ xp_milestone: 3000 }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 when xp_milestone is missing', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });

    const { POST } = await import('@/app/api/student/milestones/avail/route');
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it('returns 400 when no voucher_code is set on the milestone', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    // Row exists but voucher_code is null
    admin.from.mockReturnValue(makeChain({ data: { voucher_code: null, availed_at: null }, error: null }));

    const { POST } = await import('@/app/api/student/milestones/avail/route');
    const res = await POST(makeRequest({ xp_milestone: 3000 }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no voucher/i);
  });

  it('returns 400 when voucher has already been availed', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from.mockReturnValueOnce(
      makeChain({ data: { voucher_code: 'AMZN-ABCD', availed_at: '2026-05-01T10:00:00Z' }, error: null })
    );

    const { POST } = await import('@/app/api/student/milestones/avail/route');
    const res = await POST(makeRequest({ xp_milestone: 3000 }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/already availed/i);
  });

  it('returns 400 when milestone row does not exist', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    // .single() returns null data
    admin.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { POST } = await import('@/app/api/student/milestones/avail/route');
    const res = await POST(makeRequest({ xp_milestone: 3000 }) as never);
    expect(res.status).toBe(400);
  });

  it('marks availed and returns success when voucher is valid and unused', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    // First call: select (single row with voucher_code set, not availed)
    admin.from
      .mockReturnValueOnce(makeChain({ data: { voucher_code: 'AMZN-ABCD', availed_at: null }, error: null }))
      // Second call: update availed_at
      .mockReturnValue(makeChain({ data: null, error: null }));

    const { POST } = await import('@/app/api/student/milestones/avail/route');
    const res = await POST(makeRequest({ xp_milestone: 3000 }) as never);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('returns 500 when DB update fails', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from
      .mockReturnValueOnce(makeChain({ data: { voucher_code: 'AMZN-ABCD', availed_at: null }, error: null }))
      .mockReturnValue(makeChain({ data: null, error: { message: 'update error' } }));

    const { POST } = await import('@/app/api/student/milestones/avail/route');
    const res = await POST(makeRequest({ xp_milestone: 3000 }) as never);
    expect(res.status).toBe(500);
  });
});
