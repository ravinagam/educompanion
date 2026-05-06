import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeChain } from '../helpers/mock-supabase';

const sb = { getUser: vi.fn(), from: vi.fn() };
const admin = { from: vi.fn() };

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: sb.getUser }, from: sb.from }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: admin.from }),
}));

const mockAwardXp = vi.fn();
vi.mock('@/lib/gamification', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gamification')>();
  return { ...actual, awardXp: mockAwardXp };
});

const MOCK_USER = { id: 'user-1', email: 'test@example.com' };
const MOCK_GAMIFICATION_ROW = {
  user_id: 'user-1',
  total_xp: 350,
  level: 3,
  current_streak: 5,
  longest_streak: 10,
  last_active_date: '2026-05-05',
  updated_at: '2026-05-05T10:00:00Z',
};

function makePostRequest(body: object) {
  return new Request('http://localhost/api/gamification/xp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/gamification/xp', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import('@/app/api/gamification/xp/route');
    const res = await GET();

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
  });

  it('returns gamification row for authenticated user', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from.mockReturnValue(makeChain({ data: MOCK_GAMIFICATION_ROW, error: null }));

    const { GET } = await import('@/app/api/gamification/xp/route');
    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual(MOCK_GAMIFICATION_ROW);
  });

  it('returns null data when no gamification row exists', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { GET } = await import('@/app/api/gamification/xp/route');
    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeNull();
  });
});

describe('POST /api/gamification/xp', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/gamification/xp/route');
    const res = await POST(makePostRequest({ event: 'video_watched' }) as any);

    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid event (quiz_completed is server-only)', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });

    const { POST } = await import('@/app/api/gamification/xp/route');
    const res = await POST(makePostRequest({ event: 'quiz_completed' }) as any);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid event');
  });

  it('returns 400 for an unknown event string', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });

    const { POST } = await import('@/app/api/gamification/xp/route');
    const res = await POST(makePostRequest({ event: 'cheat_xp' }) as any);

    expect(res.status).toBe(400);
  });

  it('returns XP data for valid event (video_watched)', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockAwardXp.mockResolvedValue({
      row: { ...MOCK_GAMIFICATION_ROW, total_xp: 380 },
      xp_awarded: 30,
      xp_base: 30,
      multiplier: 1,
    });

    const { POST } = await import('@/app/api/gamification/xp/route');
    const res = await POST(makePostRequest({ event: 'video_watched' }) as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.xp_awarded).toBe(30);
    expect(json.xp_multiplier).toBe(1);
    expect(json.data.total_xp).toBe(380);
  });

  it('returns XP data for valid event (chat_message)', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockAwardXp.mockResolvedValue({
      row: { ...MOCK_GAMIFICATION_ROW, total_xp: 355 },
      xp_awarded: 5,
      xp_base: 5,
      multiplier: 1,
    });

    const { POST } = await import('@/app/api/gamification/xp/route');
    const res = await POST(makePostRequest({ event: 'chat_message' }) as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.xp_awarded).toBe(5);
  });
});
