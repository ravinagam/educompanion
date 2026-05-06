import { describe, it, expect } from 'vitest';
import { XP_REWARDS, streakMultiplier } from '@/lib/gamification';

// Pure scoring logic extracted from /api/quiz-attempts route
function calcXpBase(score: number, total: number): number {
  const pct = total > 0 ? score / total : 0;
  return XP_REWARDS.quiz_completed + (pct >= 0.8 ? XP_REWARDS.quiz_bonus_80pct : 0);
}

function calcFinalXp(xpBase: number, streak: number): number {
  return Math.round(xpBase * streakMultiplier(streak));
}

describe('quiz XP base calculation', () => {
  it('awards base XP (50) for any score below 80%', () => {
    expect(calcXpBase(0, 10)).toBe(50);
    expect(calcXpBase(7, 10)).toBe(50); // 70%
    expect(calcXpBase(7, 9)).toBe(50);  // 77.7%
  });

  it('awards base + bonus XP (80) for score exactly 80%', () => {
    expect(calcXpBase(8, 10)).toBe(80);
  });

  it('awards base + bonus XP (80) for score above 80%', () => {
    expect(calcXpBase(9, 10)).toBe(80);  // 90%
    expect(calcXpBase(10, 10)).toBe(80); // 100%
  });

  it('awards base XP for empty quiz (0 questions)', () => {
    expect(calcXpBase(0, 0)).toBe(50);
  });

  it('awards bonus at exactly 80% boundary (4/5)', () => {
    expect(calcXpBase(4, 5)).toBe(80); // 80% exactly
  });

  it('does not award bonus just below 80% (3/4 = 75%)', () => {
    expect(calcXpBase(3, 4)).toBe(50);
  });
});

describe('quiz XP with streak multiplier', () => {
  it('no multiplier on streak < 3', () => {
    expect(calcFinalXp(80, 1)).toBe(80);
    expect(calcFinalXp(80, 2)).toBe(80);
  });

  it('1.5× multiplier on 3-day streak', () => {
    expect(calcFinalXp(80, 3)).toBe(120); // 80 * 1.5
  });

  it('2× multiplier on 7-day streak', () => {
    expect(calcFinalXp(80, 7)).toBe(160); // 80 * 2
  });

  it('rounds fractional XP correctly', () => {
    // 50 * 1.5 = 75 (exact)
    expect(calcFinalXp(50, 3)).toBe(75);
  });

  it('max XP scenario: 100% score + 7-day streak', () => {
    const xpBase = calcXpBase(10, 10); // 80 XP
    expect(calcFinalXp(xpBase, 7)).toBe(160); // 80 * 2
  });
});

describe('answer scoring', () => {
  // Mirrors the server-side logic: trim + lowercase comparison
  function isCorrect(chosen: string, correct: string): boolean {
    return chosen.trim().toLowerCase() === correct.trim().toLowerCase();
  }

  it('matches exact answer', () => {
    expect(isCorrect('Paris', 'Paris')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isCorrect('paris', 'Paris')).toBe(true);
    expect(isCorrect('PARIS', 'paris')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(isCorrect('  Paris  ', 'Paris')).toBe(true);
  });

  it('returns false for wrong answer', () => {
    expect(isCorrect('London', 'Paris')).toBe(false);
  });

  it('returns false for empty answer', () => {
    expect(isCorrect('', 'Paris')).toBe(false);
  });
});
