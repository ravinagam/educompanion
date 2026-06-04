export interface GiftMilestone {
  xp: number;
  voucher_inr: number;
  label: string;
}

export const GIFT_MILESTONES: GiftMilestone[] = [
  { xp: 3_000,  voucher_inr: 100, label: '₹100 Amazon Voucher' },
  { xp: 6_000,  voucher_inr: 200, label: '₹200 Amazon Voucher' },
  { xp: 10_000, voucher_inr: 400, label: '₹400 Amazon Voucher' },
  { xp: 15_000, voucher_inr: 750, label: '₹750 Amazon Voucher' },
];

/** Returns the next unclaimed milestone given current XP and already-gifted XP thresholds. */
export function nextMilestone(
  totalXp: number,
  claimedXpLevels: number[],
): GiftMilestone | null {
  return (
    GIFT_MILESTONES.find(m => !claimedXpLevels.includes(m.xp) && totalXp < m.xp) ?? null
  );
}

/** Returns how many XP remain until the next unclaimed milestone. */
export function xpToNextMilestone(
  totalXp: number,
  claimedXpLevels: number[],
): number | null {
  const next = nextMilestone(totalXp, claimedXpLevels);
  return next ? next.xp - totalXp : null;
}

/** Returns all milestones that have been crossed but not yet recorded as gifted. */
export function pendingMilestones(
  totalXp: number,
  claimedXpLevels: number[],
): GiftMilestone[] {
  return GIFT_MILESTONES.filter(
    m => totalXp >= m.xp && !claimedXpLevels.includes(m.xp),
  );
}
