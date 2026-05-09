import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeChain } from '../helpers/mock-supabase';

const admin = { from: vi.fn() };

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: admin.from }),
}));

function makeRequest(body: object) {
  return new Request('http://localhost/api/referrals/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/referrals/click', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 400 when code is missing', async () => {
    const { POST } = await import('@/app/api/referrals/click/route');
    const res = await POST(makeRequest({}) as never);

    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
  });

  it('returns 400 when code is not a string', async () => {
    const { POST } = await import('@/app/api/referrals/click/route');
    const res = await POST(makeRequest({ code: 12345 }) as never);

    expect(res.status).toBe(400);
  });

  it('returns 400 when code trims to an empty string', async () => {
    const { POST } = await import('@/app/api/referrals/click/route');
    const res = await POST(makeRequest({ code: '   ' }) as never);

    expect(res.status).toBe(400);
  });

  it('returns 200 and { ok: true } for a valid code', async () => {
    admin.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { POST } = await import('@/app/api/referrals/click/route');
    const res = await POST(makeRequest({ code: 'ABC123' }) as never);

    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('normalises the code to uppercase before inserting', async () => {
    const chain = makeChain({ data: null, error: null });
    const insertMock = vi.fn().mockReturnValue(chain);
    admin.from.mockReturnValue({ ...chain, insert: insertMock });

    const { POST } = await import('@/app/api/referrals/click/route');
    await POST(makeRequest({ code: 'abc123' }) as never);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ referral_code: 'ABC123' }),
    );
  });

  it('strips leading/trailing whitespace from the code', async () => {
    const chain = makeChain({ data: null, error: null });
    const insertMock = vi.fn().mockReturnValue(chain);
    admin.from.mockReturnValue({ ...chain, insert: insertMock });

    const { POST } = await import('@/app/api/referrals/click/route');
    await POST(makeRequest({ code: '  XY99  ' }) as never);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ referral_code: 'XY99' }),
    );
  });
});
