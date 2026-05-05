import { createAdminClient } from '@/lib/supabase/admin';

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

interface GamificationRow {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  updated_at: string;
}

/**
 * Awards XP for an event and updates streak. Creates the row if it doesn't exist.
 * Returns the updated gamification row.
 */
export async function awardXp(
  userId: string,
  xpAmount: number,
): Promise<GamificationRow> {
  const admin = createAdminClient();

  // Fetch or create the row
  const { data: existing } = await admin
    .from('user_gamification')
    .select('*')
    .eq('user_id', userId)
    .single();

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (!existing) {
    // First-ever activity
    const newRow = {
      user_id: userId,
      total_xp: xpAmount,
      level: calculateLevel(xpAmount),
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    };
    const { data } = await admin.from('user_gamification').insert(newRow).select().single();
    return data as GamificationRow;
  }

  const newTotalXp = existing.total_xp + xpAmount;
  const newLevel = calculateLevel(newTotalXp);

  // Streak calculation
  const last = existing.last_active_date;
  let newStreak = existing.current_streak;
  let newLongest = existing.longest_streak;

  if (!last || last === today) {
    // First activity of the day (or same day): no streak change
    newStreak = last === today ? existing.current_streak : existing.current_streak; // unchanged
    if (!last) newStreak = 1;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (last === yesterdayStr) {
      newStreak = existing.current_streak + 1;
    } else {
      newStreak = 1; // streak broken
    }
  }

  if (newStreak > newLongest) newLongest = newStreak;

  const { data } = await admin
    .from('user_gamification')
    .update({
      total_xp: newTotalXp,
      level: newLevel,
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  return data as GamificationRow;
}
