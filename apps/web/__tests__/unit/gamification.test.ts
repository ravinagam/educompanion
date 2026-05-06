import { describe, it, expect } from 'vitest';
import {
  calculateLevel,
  xpForLevel,
  xpForNextLevel,
  streakMultiplier,
  streakMultiplierLabel,
  XP_REWARDS,
} from '@/lib/gamification';

describe('XP_REWARDS', () => {
  it('has expected values for all events', () => {
    expect(XP_REWARDS.chapter_uploaded).toBe(25);
    expect(XP_REWARDS.quiz_completed).toBe(50);
    expect(XP_REWARDS.quiz_bonus_80pct).toBe(30);
    expect(XP_REWARDS.flashcard_known).toBe(5);
    expect(XP_REWARDS.video_watched).toBe(30);
    expect(XP_REWARDS.chat_message).toBe(5);
    expect(XP_REWARDS.summary_generated).toBe(10);
  });
});

describe('calculateLevel', () => {
  it('returns level 1 for 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns level 1 for 99 XP (just below level 2 threshold)', () => {
    expect(calculateLevel(99)).toBe(1);
  });

  it('returns level 2 at exactly 100 XP', () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it('returns level 3 at exactly 300 XP', () => {
    expect(calculateLevel(300)).toBe(3);
  });

  it('returns level 5 at 1000 XP', () => {
    expect(calculateLevel(1000)).toBe(5);
  });

  it('returns level 10 (max) at 9000 XP', () => {
    expect(calculateLevel(9000)).toBe(10);
  });

  it('returns level 10 for XP beyond 9000', () => {
    expect(calculateLevel(99999)).toBe(10);
  });

  it('returns level 9 at 6000 XP (one below max)', () => {
    expect(calculateLevel(6000)).toBe(9);
  });
});

describe('xpForLevel', () => {
  it('returns 0 for level 1', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('returns correct threshold for level 2', () => {
    expect(xpForLevel(2)).toBe(100);
  });

  it('returns correct threshold for level 10', () => {
    expect(xpForLevel(10)).toBe(9000);
  });
});

describe('xpForNextLevel', () => {
  it('returns level 2 threshold when at level 1', () => {
    expect(xpForNextLevel(1)).toBe(100);
  });

  it('returns level 3 threshold when at level 2', () => {
    expect(xpForNextLevel(2)).toBe(300);
  });

  it('returns max threshold when already at level 10', () => {
    expect(xpForNextLevel(10)).toBe(9000);
  });
});

describe('streakMultiplier', () => {
  it('returns 1× for streak of 0', () => {
    expect(streakMultiplier(0)).toBe(1);
  });

  it('returns 1× for streak of 1', () => {
    expect(streakMultiplier(1)).toBe(1);
  });

  it('returns 1× for streak of 2', () => {
    expect(streakMultiplier(2)).toBe(1);
  });

  it('returns 1.5× for streak of 3', () => {
    expect(streakMultiplier(3)).toBe(1.5);
  });

  it('returns 1.5× for streak of 6', () => {
    expect(streakMultiplier(6)).toBe(1.5);
  });

  it('returns 2× for streak of 7', () => {
    expect(streakMultiplier(7)).toBe(2);
  });

  it('returns 2× for streak of 30', () => {
    expect(streakMultiplier(30)).toBe(2);
  });
});

describe('streakMultiplierLabel', () => {
  it('returns empty string for streak < 3', () => {
    expect(streakMultiplierLabel(0)).toBe('');
    expect(streakMultiplierLabel(2)).toBe('');
  });

  it('returns "1.5×" for streak 3–6', () => {
    expect(streakMultiplierLabel(3)).toBe('1.5×');
    expect(streakMultiplierLabel(6)).toBe('1.5×');
  });

  it('returns "2×" for streak ≥ 7', () => {
    expect(streakMultiplierLabel(7)).toBe('2×');
    expect(streakMultiplierLabel(100)).toBe('2×');
  });
});
