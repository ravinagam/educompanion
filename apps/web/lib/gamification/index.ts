import { createAdminClient } from '@/lib/supabase/admin';
import { GIFT_MILESTONES, pendingMilestones, nextMilestone, type GiftMilestone } from './milestones';
import { sendExpoPush } from './push';

export { GIFT_MILESTONES, type GiftMilestone } from './milestones';
export { nextMilestone, xpToNextMilestone } from './milestones';

export const XP_REWARDS = {
  chapter_uploaded:    25,
  quiz_completed:      50,
  quiz_bonus_80pct:    30,   // awarded on top of quiz_completed when score >= 80%
  flashcard_known:      5,   // per card marked 'known'
  video_watched:       30,
  chat_message:         5,
  summary_generated:   10,
} as const;

export type XpEvent = keyof typeof XP_REWARDS;

// XP required to reach each level (index = level number)
const LEVEL_THRESHOLDS = [0, 0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 9000];

export function calculateLevel(totalXp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 2; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) { level = i; break; }
  }
  return level;
}

export function xpForNextLevel(level: number): number {
  const next = level + 1;
  return next < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[next] : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export function xpForLevel(level: number): number {
  return level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export function streakMultiplier(streak: number): number {
  if (streak >= 7) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

export function streakMultiplierLabel(streak: number): string {
  if (streak >= 7) return '2×';
  if (streak >= 3) return '1.5×';
  return '';
}

interface GamificationRow {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  updated_at: string;
}

export interface AwardResult {
  row: GamificationRow;
  xp_awarded: number;
  xp_base: number;
  multiplier: number;
  milestone_reached: GiftMilestone | null;
  xp_to_next_milestone: number | null;
}

async function checkMilestones(
  userId: string,
  newTotalXp: number,
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ milestoneReached: GiftMilestone | null; xpToNext: number | null }> {
  const { data: claimedRows } = await admin
    .from('user_gift_milestones')
    .select('xp_milestone')
    .eq('user_id', userId);

  const claimedLevels = (claimedRows ?? []).map((r: { xp_milestone: number }) => r.xp_milestone);
  const pending = pendingMilestones(newTotalXp, claimedLevels);

  let milestoneReached: GiftMilestone | null = null;

  if (pending.length > 0) {
    await admin.from('user_gift_milestones').insert(
      pending.map(m => ({ user_id: userId, xp_milestone: m.xp, voucher_inr: m.voucher_inr }))
    );
    milestoneReached = pending[0];

    const { data: userRow } = await admin
      .from('users')
      .select('expo_push_token')
      .eq('id', userId)
      .single();

    if (userRow?.expo_push_token) {
      sendExpoPush(
        userRow.expo_push_token,
        '🎉 Reward Unlocked!',
        `You've earned a ${milestoneReached.label}! Open your profile to see it.`,
      ).catch(() => {});
    }
  }

  const updatedClaimed = [...claimedLevels, ...pending.map(m => m.xp)];
  const next = nextMilestone(newTotalXp, updatedClaimed);
  const xpToNext = next ? next.xp - newTotalXp : null;

  return { milestoneReached, xpToNext };
}

/**
 * Awards XP for an event and updates streak. Creates the row if it doesn't exist.
 * Applies a streak multiplier: 3–6 day streak = 1.5×, ≥7 day = 2×.
 * Also checks gift milestones and fires push notification when one is crossed.
 */
export async function awardXp(
  userId: string,
  xpBase: number,
): Promise<AwardResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('user_gamification')
    .select('*')
    .eq('user_id', userId)
    .single();

  const today = new Date().toISOString().slice(0, 10);

  if (!existing) {
    const multiplier = 1;
    const xpAwarded = xpBase;
    const newTotalXp = xpAwarded;
    const newRow = {
      user_id: userId,
      total_xp: newTotalXp,
      level: calculateLevel(newTotalXp),
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    };
    const { data } = await admin.from('user_gamification').insert(newRow).select().single();
    const { milestoneReached, xpToNext } = await checkMilestones(userId, newTotalXp, admin);
    return { row: data as GamificationRow, xp_awarded: xpAwarded, xp_base: xpBase, multiplier, milestone_reached: milestoneReached, xp_to_next_milestone: xpToNext };
  }

  // Streak calculation
  const last = existing.last_active_date;
  let newStreak = existing.current_streak;
  let newLongest = existing.longest_streak;

  if (!last) {
    newStreak = 1;
  } else if (last === today) {
    newStreak = existing.current_streak;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    newStreak = last === yesterdayStr ? existing.current_streak + 1 : 1;
  }

  if (newStreak > newLongest) newLongest = newStreak;

  const multiplier = streakMultiplier(newStreak);
  const xpAwarded = Math.round(xpBase * multiplier);
  const newTotalXp = existing.total_xp + xpAwarded;

  const { data } = await admin
    .from('user_gamification')
    .update({
      total_xp: newTotalXp,
      level: calculateLevel(newTotalXp),
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  const { milestoneReached, xpToNext } = await checkMilestones(userId, newTotalXp, admin);
  return { row: data as GamificationRow, xp_awarded: xpAwarded, xp_base: xpBase, multiplier, milestone_reached: milestoneReached, xp_to_next_milestone: xpToNext };
}
