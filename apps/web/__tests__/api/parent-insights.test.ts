import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeChain } from '../helpers/mock-supabase';
import { generateParentInsights } from '@/lib/ai/parent-insights';

// Module-level mock state
const sb = { getUser: vi.fn(), from: vi.fn() };
const admin = { from: vi.fn() };

vi.mock('@/lib/supabase/parent-server', () => ({
  createParentServerClient: async () => ({ auth: { getUser: sb.getUser }, from: sb.from }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: admin.from }),
}));

vi.mock('@/lib/ai/parent-insights', () => ({
  generateParentInsights: vi.fn(),
}));

const MOCK_INSIGHTS = {
  strengths: ['Good quiz performance in Maths'],
  weaknesses: ['Science needs more practice'],
  opportunities: ['Near mastery in Social Studies'],
  threats: ['Inconsistent study streak'],
  recommendations: ['Revise Science this week'],
  alerts: [],
  parent_message: 'Arjun is doing well overall.',
};

const PARENT_USER = {
  id: 'parent-1',
  user_metadata: { role: 'parent', phone: '9876543210' },
};

const STUDENT_ROW = {
  phone_number: '9876543210',
  name: 'Arjun',
  grade: 9,
  board: 'CBSE',
};

const FRESH_INSIGHTS = {
  insights_json: { strengths: ['Good scores'] },
  generated_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h from now
};

const STALE_INSIGHTS = {
  insights_json: { strengths: ['Old data'] },
  generated_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  expires_at: new Date(Date.now() - 1000).toISOString(), // expired
};

function makeParams(studentId = 'student-1') {
  return { params: Promise.resolve({ studentId }) };
}

describe('GET /api/parent/insights/[studentId]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import('@/app/api/parent/insights/[studentId]/route');
    const res = await GET(new Request('http://localhost') as any, makeParams() as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 when user is not a parent', async () => {
    sb.getUser.mockResolvedValue({
      data: { user: { id: 'student-1', user_metadata: { role: 'student' } } },
    });

    const { GET } = await import('@/app/api/parent/insights/[studentId]/route');
    const res = await GET(new Request('http://localhost') as any, makeParams() as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 when student phone does not match parent phone', async () => {
    sb.getUser.mockResolvedValue({ data: { user: PARENT_USER } });
    admin.from.mockReturnValue(makeChain({ data: { phone_number: '1111111111' }, error: null }));

    const { GET } = await import('@/app/api/parent/insights/[studentId]/route');
    const res = await GET(new Request('http://localhost') as any, makeParams() as any);
    expect(res.status).toBe(401);
  });

  it('returns fresh cached insights when not expired', async () => {
    sb.getUser.mockResolvedValue({ data: { user: PARENT_USER } });
    admin.from
      .mockReturnValueOnce(makeChain({ data: STUDENT_ROW, error: null }))   // student lookup
      .mockReturnValueOnce(makeChain({ data: FRESH_INSIGHTS, error: null })); // cache lookup

    const { GET } = await import('@/app/api/parent/insights/[studentId]/route');
    const res = await GET(new Request('http://localhost') as any, makeParams() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fresh).toBe(true);
    expect(json.insights).toBeDefined();
  });

  it('returns null insights when cache is stale', async () => {
    sb.getUser.mockResolvedValue({ data: { user: PARENT_USER } });
    admin.from
      .mockReturnValueOnce(makeChain({ data: STUDENT_ROW, error: null }))
      .mockReturnValueOnce(makeChain({ data: STALE_INSIGHTS, error: null }));

    const { GET } = await import('@/app/api/parent/insights/[studentId]/route');
    const res = await GET(new Request('http://localhost') as any, makeParams() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fresh).toBe(false);
    expect(json.insights).toBeNull();
  });
});

describe('POST /api/parent/insights/[studentId]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(generateParentInsights).mockResolvedValue(MOCK_INSIGHTS);
  });

  it('returns 401 when not a parent', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/parent/insights/[studentId]/route');
    const res = await POST(new Request('http://localhost') as any, makeParams() as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 when student phone does not match', async () => {
    sb.getUser.mockResolvedValue({ data: { user: PARENT_USER } });
    admin.from.mockReturnValue(makeChain({ data: { phone_number: '0000000000', name: 'X', grade: 8, board: 'CBSE' }, error: null }));

    const { POST } = await import('@/app/api/parent/insights/[studentId]/route');
    const res = await POST(new Request('http://localhost') as any, makeParams() as any);
    expect(res.status).toBe(401);
  });

  it('generates and returns insights for verified parent', async () => {
    sb.getUser.mockResolvedValue({ data: { user: PARENT_USER } });

    // Calls happen in this order inside the POST handler:
    // 1. student lookup (.single()) — phone verification
    admin.from.mockReturnValueOnce(makeChain({ data: STUDENT_ROW, error: null }));
    // 2a. user_gamification (.single())
    admin.from.mockReturnValueOnce(makeChain({ data: { current_streak: 2, last_active_date: null }, error: null }));
    // 2b. subjects (array)
    admin.from.mockReturnValueOnce(makeChain({ data: [], error: null }));
    // 2c. chapter_mastery (array)
    admin.from.mockReturnValueOnce(makeChain({ data: [], error: null }));
    // 2d. quiz_attempts (array) — must be array so .filter() works
    admin.from.mockReturnValueOnce(makeChain({ data: [], error: null }));
    // 2e. flashcard_progress (array)
    admin.from.mockReturnValueOnce(makeChain({ data: [], error: null }));
    // 3. parent_insights upsert
    admin.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { POST } = await import('@/app/api/parent/insights/[studentId]/route');
    const res = await POST(new Request('http://localhost') as any, makeParams() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.insights).toBeDefined();
    expect(json.insights.parent_message).toBe('Arjun is doing well overall.');
  });
});
