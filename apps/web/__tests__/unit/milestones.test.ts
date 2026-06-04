import { describe, it, expect } from 'vitest';
import {
  GIFT_MILESTONES,
  nextMilestone,
  xpToNextMilestone,
  pendingMilestones,
} from '@/lib/gamification/milestones';

describe('GIFT_MILESTONES', () => {
  it('has exactly four tiers', () => {
    expect(GIFT_MILESTONES).toHaveLength(4);
  });

  it('tiers are in ascending XP order', () => {
    for (let i = 1; i < GIFT_MILESTONES.length; i++) {
      expect(GIFT_MILESTONES[i].xp).toBeGreaterThan(GIFT_MILESTONES[i - 1].xp);
    }
  });

  it('each tier has a positive voucher_inr value', () => {
    for (const m of GIFT_MILESTONES) {
      expect(m.voucher_inr).toBeGreaterThan(0);
    }
  });
});

describe('nextMilestone', () => {
  it('returns the first milestone when XP is 0 and none are claimed', () => {
    const m = nextMilestone(0, []);
    expect(m?.xp).toBe(3_000);
  });

  it('returns null when XP has already passed all milestones', () => {
    expect(nextMilestone(99_999, [])).toBeNull();
  });

  it('returns null when XP equals the last milestone (not strictly less than)', () => {
    expect(nextMilestone(15_000, [])).toBeNull();
  });

  it('skips the claimed first milestone and returns the second', () => {
    const m = nextMilestone(3_500, [3_000]);
    expect(m?.xp).toBe(6_000);
  });

  it('returns null when all milestones are claimed regardless of XP', () => {
    const allClaimed = GIFT_MILESTONES.map(m => m.xp);
    expect(nextMilestone(0, allClaimed)).toBeNull();
  });

  it('returns the correct tier just below the threshold', () => {
    const m = nextMilestone(5_999, [3_000]);
    expect(m?.xp).toBe(6_000);
  });
});

describe('xpToNextMilestone', () => {
  it('returns the full first milestone XP when starting from 0', () => {
    expect(xpToNextMilestone(0, [])).toBe(3_000);
  });

  it('returns the correct gap to the first milestone with partial progress', () => {
    expect(xpToNextMilestone(1_000, [])).toBe(2_000);
  });

  it('returns the correct gap to the second milestone after the first is claimed', () => {
    expect(xpToNextMilestone(4_000, [3_000])).toBe(2_000); // 6000 - 4000
  });

  it('returns null when all milestones are claimed and XP is high', () => {
    const allClaimed = GIFT_MILESTONES.map(m => m.xp);
    expect(xpToNextMilestone(15_000, allClaimed)).toBeNull();
  });
});

describe('pendingMilestones', () => {
  it('returns empty array when XP is below all milestones', () => {
    expect(pendingMilestones(0, [])).toEqual([]);
    expect(pendingMilestones(2_999, [])).toEqual([]);
  });

  it('returns first milestone when XP exactly reaches it', () => {
    const pending = pendingMilestones(3_000, []);
    expect(pending).toHaveLength(1);
    expect(pending[0].xp).toBe(3_000);
  });

  it('returns multiple milestones when XP spans several at once', () => {
    // XP = 7000 crosses first (3000) and second (6000), not third (10000)
    const pending = pendingMilestones(7_000, []);
    expect(pending).toHaveLength(2);
    expect(pending.map(m => m.xp)).toEqual([3_000, 6_000]);
  });

  it('returns all four milestones when XP crosses all of them', () => {
    expect(pendingMilestones(15_000, [])).toHaveLength(4);
  });

  it('excludes already-claimed milestones', () => {
    const pending = pendingMilestones(7_000, [3_000]);
    expect(pending).toHaveLength(1);
    expect(pending[0].xp).toBe(6_000);
  });

  it('returns empty when all milestones are claimed even if XP is very high', () => {
    const allClaimed = GIFT_MILESTONES.map(m => m.xp);
    expect(pendingMilestones(99_999, allClaimed)).toEqual([]);
  });
});
