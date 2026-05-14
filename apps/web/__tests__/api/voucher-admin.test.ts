import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeChain } from '../helpers/mock-supabase';

const adminSession = { getUser: vi.fn() };
const admin = { from: vi.fn() };

vi.mock('@/lib/supabase/admin-server', () => ({
  createAdminSessionClient: async () => ({ auth: { getUser: adminSession.getUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: admin.from }),
}));

const ADMIN_USER = { id: 'admin-1', email: 'ravi.nagam.kiran@gmail.com' };
const OTHER_USER = { id: 'other-1', email: 'student@example.com' };

function makeRequest(body: object) {
  return new Request('http://localhost/api/admin/milestones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/milestones', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 403 when not authenticated', async () => {
    adminSession.getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/admin/milestones/route');
    const res = await POST(makeRequest({ user_id: 'u1', xp_milestone: 3000, voucher_code: 'ABC' }) as never);
    expect(res.status).toBe(403);
  });

  it('returns 403 when authenticated as a non-admin email', async () => {
    adminSession.getUser.mockResolvedValue({ data: { user: OTHER_USER } });

    const { POST } = await import('@/app/api/admin/milestones/route');
    const res = await POST(makeRequest({ user_id: 'u1', xp_milestone: 3000, voucher_code: 'ABC' }) as never);
    expect(res.status).toBe(403);
  });

  it('returns 400 when user_id is missing', async () => {
    adminSession.getUser.mockResolvedValue({ data: { user: ADMIN_USER } });

    const { POST } = await import('@/app/api/admin/milestones/route');
    const res = await POST(makeRequest({ xp_milestone: 3000, voucher_code: 'ABC' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when voucher_code is blank whitespace', async () => {
    adminSession.getUser.mockResolvedValue({ data: { user: ADMIN_USER } });

    const { POST } = await import('@/app/api/admin/milestones/route');
    const res = await POST(makeRequest({ user_id: 'u1', xp_milestone: 3000, voucher_code: '   ' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when xp_milestone is missing', async () => {
    adminSession.getUser.mockResolvedValue({ data: { user: ADMIN_USER } });

    const { POST } = await import('@/app/api/admin/milestones/route');
    const res = await POST(makeRequest({ user_id: 'u1', voucher_code: 'XYZ123' }) as never);
    expect(res.status).toBe(400);
  });

  it('saves voucher code and returns success for valid admin request', async () => {
    adminSession.getUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    admin.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { POST } = await import('@/app/api/admin/milestones/route');
    const res = await POST(makeRequest({ user_id: 'u1', xp_milestone: 3000, voucher_code: 'AMZN-1234-ABCD' }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 500 when DB update fails', async () => {
    adminSession.getUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    admin.from.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));

    const { POST } = await import('@/app/api/admin/milestones/route');
    const res = await POST(makeRequest({ user_id: 'u1', xp_milestone: 3000, voucher_code: 'AMZN-1234' }) as never);
    expect(res.status).toBe(500);
  });
});
