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
  minutesPerTopic: number;
}

const DEFAULT_DAILY_MINUTES = 30;

export async function buildStudyPlan(
  testId: string,
  chapterIds: string[],
  testDate: string,
  subjectConfig: SubjectConfig[],
  planStartDate?: string
): Promise<void> {
  const admin = createAdminClient();

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

  const { data: rawChapters } = await admin
    .from('chapters')
    .select('id, name, content_text, complexity_score, subject_id, subjects(name)')
    .in('id', chapterIds);

  if (!rawChapters?.length) return;

  const chapters = rawChapters as unknown as ChapterRow[];

  await admin.from('study_plans').delete().eq('test_id', testId);

  const configMap = new Map(subjectConfig.map(s => [s.subject_id, s.daily_minutes]));

  const chsBySubject = new Map<string, ChapterRow[]>();
  for (const ch of chapters) {
    if (!chsBySubject.has(ch.subject_id)) chsBySubject.set(ch.subject_id, []);
    chsBySubject.get(ch.subject_id)!.push(ch);
  }

  const subjectQueues = new Map<string, TopicQueue[]>();

  for (const [subjId, chs] of chsBySubject) {
    const dailyMin = configMap.get(subjId) ?? DEFAULT_DAILY_MINUTES;
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

      queue.push({ chapter_id: ch.id, chapter_name: ch.name, topics, cursor: 0, minutesPerTopic });
    }

    subjectQueues.set(subjId, queue);
  }

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

    for (const [subjId, queue] of subjectQueues) {
      const dailyMin = configMap.get(subjId) ?? DEFAULT_DAILY_MINUTES;
      let budgetLeft = dailyMin;

      for (const ch of queue) {
        if (ch.cursor >= ch.topics.length) continue;
        if (budgetLeft <= 0) break;

        const dayTopics: string[] = [];
        let sessionMinutes = 0;

        while (ch.cursor < ch.topics.length) {
          const wouldExceed = sessionMinutes + ch.minutesPerTopic > budgetLeft;
          if (wouldExceed && dayTopics.length > 0) break;
          dayTopics.push(ch.topics[ch.cursor]);
          sessionMinutes += ch.minutesPerTopic;
          ch.cursor++;
          if (wouldExceed) break;
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
        }
      }
    }

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
