import { createAdminClient } from '@/lib/supabase/admin';
import { extractChapterSections } from '@/lib/ai/claude';

export interface SubjectConfig {
  subject_id: string;
  subject_name: string;
  daily_minutes: number;
}

interface ChapterRow {
  id: string;
  name: string;
  content_text: string | null;
  complexity_score: number | null;
  subject_id: string;
  subjects: { name: string } | null;
}

interface TopicQueue {
  chapter_id: string;
  chapter_name: string;
  topics: string[];
  cursor: number;
  minutes_per_topic: number;
}

const DEFAULT_DAILY_MINUTES = 30;

/**
 * Delete existing plan rows and rebuild a multi-subject, section-aware
 * study schedule starting from tomorrow up to the test date.
 *
 * Each day gets one session block per selected subject, each block
 * consuming exactly `daily_minutes` from that subject's topic queue.
 */
export async function buildStudyPlan(
  testId: string,
  chapterIds: string[],
  testDate: string,
  subjectConfig: SubjectConfig[],
  planStartDate?: string        // ISO date string; defaults to today if omitted
): Promise<void> {
  const admin = createAdminClient();

  // ── Date setup ──────────────────────────────────────────────────────────────
  // Parse as LOCAL date to avoid UTC midnight shifting the date by one day in
  // timezones east of UTC (e.g. IST: new Date('2026-05-04') = May 3 at 18:30 UTC)
  function parseLocalDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function fmtLocalDate(dt: Date): string {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  const startDate = planStartDate ? parseLocalDate(planStartDate) : new Date();
  startDate.setHours(0, 0, 0, 0);

  const deadline = parseLocalDate(testDate);
  deadline.setHours(0, 0, 0, 0);

  const daysAvailable = Math.max(
    1,
    Math.ceil((deadline.getTime() - startDate.getTime()) / 86_400_000)
  );

  // ── Fetch chapters with subject info ─────────────────────────────────────
  const { data: chapters } = await admin
    .from('chapters')
    .select('id, name, content_text, complexity_score, subject_id, subjects(name)')
    .in('id', chapterIds);

  if (!chapters?.length) return;

  // ── Wipe old plan ─────────────────────────────────────────────────────────
  await admin.from('study_plans').delete().eq('test_id', testId);

  // ── Group chapters by subject ─────────────────────────────────────────────
  const configMap = new Map(subjectConfig.map(s => [s.subject_id, s.daily_minutes]));

  const typedChapters = chapters as ChapterRow[];
  const chsBySubject = new Map<string, ChapterRow[]>();
  for (const ch of typedChapters) {
    if (!chsBySubject.has(ch.subject_id)) chsBySubject.set(ch.subject_id, []);
    chsBySubject.get(ch.subject_id)!.push(ch);
  }

  // ── Build per-subject topic queues ────────────────────────────────────────
  const subjectQueues = new Map<string, TopicQueue[]>();

  for (const [subjId, chs] of chsBySubject) {
    const dailyMin = configMap.get(subjId) ?? DEFAULT_DAILY_MINUTES;
    // Aim for ~5 topics per daily session; each topic ≈ dailyMin/5 min
    const targetTopicsPerSession = 5;
    const queue: TopicQueue[] = [];

    for (const ch of chs) {
      let topics: string[] = [];
      if (ch.content_text) {
        try {
          topics = await extractChapterSections(ch.name, ch.content_text);
        } catch {
          topics = [ch.name];
        }
      } else {
        topics = [ch.name];
      }

      const minutesPerTopic = Math.max(
        5,
        Math.round(dailyMin / Math.min(topics.length, targetTopicsPerSession))
      );

      queue.push({ chapter_id: ch.id, chapter_name: ch.name, topics, cursor: 0, minutesPerTopic: minutesPerTopic } as unknown as TopicQueue);
    }

    subjectQueues.set(subjId, queue);
  }

  // ── Day-by-day scheduling ─────────────────────────────────────────────────
  const planRows: Array<{
    test_id: string;
    day_date: string;
    chapter_id: string;
    topics: string[];
    estimated_minutes: number;
  }> = [];

  const currentDate = new Date(startDate);

  for (let day = 0; day < daysAvailable; day++) {
    const dayStr = fmtLocalDate(currentDate);

    let anyScheduledToday = false;

    for (const [subjId, queue] of subjectQueues) {
      const dailyMin = configMap.get(subjId) ?? DEFAULT_DAILY_MINUTES;
      let budgetLeft = dailyMin;

      for (const ch of queue) {
        if (ch.cursor >= ch.topics.length) continue; // chapter done
        if (budgetLeft <= 0) break;

        const minutesPerTopic = (ch as unknown as { minutesPerTopic: number }).minutesPerTopic;
        const dayTopics: string[] = [];
        let sessionMinutes = 0;

        while (ch.cursor < ch.topics.length) {
          const wouldExceed = sessionMinutes + minutesPerTopic > budgetLeft;
          if (wouldExceed && dayTopics.length > 0) break; // respect budget
          dayTopics.push(ch.topics[ch.cursor]);
          sessionMinutes += minutesPerTopic;
          ch.cursor++;
          if (wouldExceed) break; // forced first topic; stop
        }

        if (dayTopics.length > 0) {
          planRows.push({
            test_id: testId,
            day_date: dayStr,
            chapter_id: ch.chapter_id,
            topics: dayTopics,
            estimated_minutes: sessionMinutes,
          });
          budgetLeft -= sessionMinutes;
          anyScheduledToday = true;
        }
      }
    }

    // Stop early if everything is covered
    const allDone = [...subjectQueues.values()].every(q =>
      q.every(ch => ch.cursor >= ch.topics.length)
    );
    if (allDone) break;

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (planRows.length) {
    await admin.from('study_plans').insert(planRows);
  }
}
