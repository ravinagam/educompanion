import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeChain } from '../helpers/mock-supabase';

// Module-level mock state
const admin = {
  from: vi.fn(),
  createUser: vi.fn(),
};

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: admin.from,
    auth: { admin: { createUser: admin.createUser } },
  }),
}));

// parent-auth utility is real (no mock needed — pure functions)

function makeRequest(body: object) {
  return new Request('http://localhost/api/parent/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const STUDENT_ROW = { id: 'student-1' };

describe('POST /api/parent/auth/register', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 400 when phone is missing', async () => {
    const { POST } = await import('@/app/api/parent/auth/register/route');
    const res = await POST(makeRequest({ password: 'password123' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  it('returns 400 when password is missing', async () => {
    const { POST } = await import('@/app/api/parent/auth/register/route');
    const res = await POST(makeRequest({ phone: '9876543210' }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const { POST } = await import('@/app/api/parent/auth/register/route');
    const res = await POST(makeRequest({ phone: '9876543210', password: 'short' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/8 characters/i);
  });

  it('returns 400 when phone has fewer than 10 digits', async () => {
    const { POST } = await import('@/app/api/parent/auth/register/route');
    const res = await POST(makeRequest({ phone: '12345', password: 'password123' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/valid phone/i);
  });

  it('returns 404 when no student has that phone number', async () => {
    admin.from.mockReturnValue(makeChain({ data: [], error: null }));

    const { POST } = await import('@/app/api/parent/auth/register/route');
    const res = await POST(makeRequest({ phone: '9876543210', password: 'password123' }) as any);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/no student found/i);
  });

  it('returns 409 when parent account already exists', async () => {
    admin.from.mockReturnValue(makeChain({ data: [STUDENT_ROW], error: null }));
    admin.createUser.mockResolvedValue({
      data: null,
      error: { message: 'User already registered', code: 'email_exists' },
    });

    const { POST } = await import('@/app/api/parent/auth/register/route');
    const res = await POST(makeRequest({ phone: '9876543210', password: 'password123' }) as any);
    expect(res.status).toBe(409);
  });

  it('returns 200 with ok:true on successful registration', async () => {
    admin.from.mockReturnValue(makeChain({ data: [STUDENT_ROW], error: null }));
    admin.createUser.mockResolvedValue({
      data: { user: { id: 'parent-uuid-1' } },
      error: null,
    });

    const { POST } = await import('@/app/api/parent/auth/register/route');
    const res = await POST(makeRequest({ phone: '9876543210', password: 'password123' }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.userId).toBe('parent-uuid-1');
  });

  it('passes email_confirm:true so no verification email is sent', async () => {
    admin.from.mockReturnValue(makeChain({ data: [STUDENT_ROW], error: null }));
    admin.createUser.mockResolvedValue({
      data: { user: { id: 'parent-uuid-1' } },
      error: null,
    });

    const { POST } = await import('@/app/api/parent/auth/register/route');
    await POST(makeRequest({ phone: '9876543210', password: 'password123' }) as any);

    expect(admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email_confirm: true })
    );
  });

  it('stores role:parent and digits in user_metadata', async () => {
    admin.from.mockReturnValue(makeChain({ data: [STUDENT_ROW], error: null }));
    admin.createUser.mockResolvedValue({
      data: { user: { id: 'parent-uuid-1' } },
      error: null,
    });

    const { POST } = await import('@/app/api/parent/auth/register/route');
    await POST(makeRequest({ phone: '+91 98765 43210', password: 'password123' }) as any);

    expect(admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: expect.objectContaining({ role: 'parent', phone: '919876543210' }),
      })
    );
  });
});
