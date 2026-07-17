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

const SAMPLE_QUESTIONS = [
  { id: 'q1', question: 'Capital of France?', correct_answer: 'Paris', explanation: 'Paris is the capital.', type: 'mcq', options: ['Paris', 'London', 'Berlin'] },
  { id: 'q2', question: 'Capital of Germany?', correct_answer: 'Berlin', explanation: 'Berlin is the capital.', type: 'mcq', options: ['Paris', 'London', 'Berlin'] },
];

function makePostRequest(body: object) {
  return new Request('http://localhost/api/quiz-attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/quiz-attempts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAwardXp.mockResolvedValue({
      row: { user_id: 'user-1', total_xp: 130, level: 2, current_streak: 1, longest_streak: 1, last_active_date: '2026-05-06', updated_at: '' },
      xp_awarded: 80,
      xp_base: 80,
      multiplier: 1,
    });
  });

  it('returns 401 when not authenticated', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(makePostRequest({ quizId: 'q-1', answers: {} }) as any);

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
  });

  it('returns 400 when quizId is missing', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(makePostRequest({ answers: { q1: 'Paris' } }) as any);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/);
  });

  it('returns 400 when answers is missing', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(makePostRequest({ quizId: 'quiz-1' }) as any);

    expect(res.status).toBe(400);
  });

  it('returns 404 when quiz is not found', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(makePostRequest({ quizId: 'missing-quiz', answers: {} }) as any);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Quiz not found');
  });

  it('scores all correct answers and returns score=2/2', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    // Admin returns the quiz
    admin.from.mockReturnValue(makeChain({ data: { questions_json: SAMPLE_QUESTIONS }, error: null }));
    // User client returns the inserted attempt
    sb.from.mockReturnValue(makeChain({
      data: { id: 'attempt-1', user_id: 'user-1', quiz_id: 'quiz-1', score: 2, total: 2 },
      error: null,
    }));

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(
      makePostRequest({ quizId: 'quiz-1', answers: { q1: 'Paris', q2: 'Berlin' } }) as any,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.score).toBe(2);
    expect(json.data.total).toBe(2);
    expect(json.data.results[0].correct).toBe(true);
    expect(json.data.results[1].correct).toBe(true);
  });

  it('scores partial correct answers correctly', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from.mockReturnValue(makeChain({ data: { questions_json: SAMPLE_QUESTIONS }, error: null }));
    sb.from.mockReturnValue(makeChain({
      data: { id: 'attempt-2', user_id: 'user-1', quiz_id: 'quiz-1', score: 1, total: 2 },
      error: null,
    }));

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(
      makePostRequest({ quizId: 'quiz-1', answers: { q1: 'Paris', q2: 'London' } }) as any,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.score).toBe(1);
    expect(json.data.results[0].correct).toBe(true);
    expect(json.data.results[1].correct).toBe(false);
    expect(json.data.results[1].correct_answer).toBe('Berlin');
  });

  it('answer scoring is case-insensitive and trims whitespace', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from.mockReturnValue(makeChain({ data: { questions_json: SAMPLE_QUESTIONS }, error: null }));
    sb.from.mockReturnValue(makeChain({
      data: { id: 'attempt-3', score: 2, total: 2 },
      error: null,
    }));

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(
      makePostRequest({ quizId: 'quiz-1', answers: { q1: '  paris  ', q2: 'BERLIN' } }) as any,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.results[0].correct).toBe(true);
    expect(json.data.results[1].correct).toBe(true);
  });

  it('handles capitalization differences for fill-in-the-blank answers', async () => {
    const questionsWithFill = [
      { id: 'q1', question: 'A common entrance way is a ___', correct_answer: 'Door', explanation: 'Door is a common entrance', type: 'fill_blank' },
    ];
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from.mockReturnValue(makeChain({ data: { questions_json: questionsWithFill }, error: null }));
    sb.from.mockReturnValue(makeChain({
      data: { id: 'attempt-4', score: 1, total: 1 },
      error: null,
    }));

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(
      makePostRequest({ quizId: 'quiz-1', answers: { q1: 'door' } }) as any,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.results[0].correct).toBe(true); // 'door' matches 'Door'
    expect(json.data.score).toBe(1);
  });

  it('awards base XP only (50) for score below 80%', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from.mockReturnValue(makeChain({ data: { questions_json: SAMPLE_QUESTIONS }, error: null }));
    sb.from.mockReturnValue(makeChain({ data: { id: 'attempt-4', score: 1, total: 2 }, error: null }));
    mockAwardXp.mockResolvedValue({ row: {}, xp_awarded: 50, xp_base: 50, multiplier: 1 });

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(
      makePostRequest({ quizId: 'quiz-1', answers: { q1: 'Paris', q2: 'Wrong' } }) as any,
    );

    // awardXp should have been called with xpBase=50 (no bonus for 50%)
    expect(mockAwardXp).toHaveBeenCalledWith('user-1', 50);
    const json = await res.json();
    expect(json.data.xp_awarded).toBe(50);
  });

  it('awards base + bonus XP (80) for score >= 80%', async () => {
    const questions = [SAMPLE_QUESTIONS[0]]; // 1 question, 1 correct = 100%
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    admin.from.mockReturnValue(makeChain({ data: { questions_json: questions }, error: null }));
    sb.from.mockReturnValue(makeChain({ data: { id: 'attempt-5', score: 1, total: 1 }, error: null }));
    mockAwardXp.mockResolvedValue({ row: {}, xp_awarded: 80, xp_base: 80, multiplier: 1 });

    const { POST } = await import('@/app/api/quiz-attempts/route');
    const res = await POST(
      makePostRequest({ quizId: 'quiz-1', answers: { q1: 'Paris' } }) as any,
    );

    // xpBase = 50 (quiz_completed) + 30 (bonus_80pct) = 80
    expect(mockAwardXp).toHaveBeenCalledWith('user-1', 80);
    const json = await res.json();
    expect(json.data.xp_awarded).toBe(80);
  });
});
