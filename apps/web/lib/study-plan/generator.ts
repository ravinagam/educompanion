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

interface ChapterPlan {
  chapter_id: string;
  chapter_name: string;
  topics: string[];
  complexityWeight: number;
  allocatedDays: number;
  startDay: number;
}

const DEFAULT_DAILY_MINUTES = 30;

function revisionDaysFor(total: number): number {
  if (total <= 2) return 0;
  if (total <= 5) return 1;
  if (total <= 10) return 2;
  return 3;
}

// complexity_score is 1–10 → weight 0.7 (easy) to 1.3 (hard)
function complexityWeight(score: number | null): number {
  const s = score ?? 5;
  return 0.7 + ((s - 1) / 9) * 0.6;
}

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
  function addDays(dt: Date, n: number): Date {
    const d = new Date(dt);
    d.setDate(d.getDate() + n);
    return d;
  }

  const startDate = planStartDate ? parseLocalDate(planStartDate) : new Date();
  startDate.setHours(0, 0, 0, 0);

  const deadline = parseLocalDate(testDate);
  deadline.setHours(0, 0, 0, 0);

  const daysAvailable = Math.max(
    1,
    Math.ceil((deadline.getTime() - startDate.getTime()) / 86_400_000)
  );

  const revDays = revisionDaysFor(daysAvailable);
  const studyDays = Math.max(1, daysAvailable - revDays);

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

  // Step 1 — extract topics and build chapter plans per subject
  const subjectChapterPlans = new Map<string, ChapterPlan[]>();

  for (const [subjId, chs] of chsBySubject) {
    const chapterPlans: ChapterPlan[] = [];

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

      chapterPlans.push({
        chapter_id: ch.id,
        chapter_name: ch.name,
        topics,
        complexityWeight: complexityWeight(ch.complexity_score),
        allocatedDays: 1,
        startDay: 0,
      });
    }

    // Step 2 — distribute studyDays across chapters proportional to topics × complexity
    const totalWeight = chapterPlans.reduce(
      (s, c) => s + c.topics.length * c.complexityWeight,
      0
    );
    let usedDays = 0;

    for (let i = 0; i < chapterPlans.length; i++) {
      const ch = chapterPlans[i];
      const isLast = i === chapterPlans.length - 1;
      const days = isLast
        ? Math.max(1, studyDays - usedDays)
        : Math.max(1, Math.round(studyDays * (ch.topics.length * ch.complexityWeight) / totalWeight));
      ch.allocatedDays = days;
      ch.startDay = usedDays;
      usedDays += days;
    }

    subjectChapterPlans.set(subjId, chapterPlans);
  }

  const planRows: Array<{
    test_id: string;
    day_date: string;
    chapter_id: string;
    topics: string[];
    estimated_minutes: number;
  }> = [];

  // Step 3 — spread each chapter's topics evenly across its allocated days
  for (const [subjId, chapterPlans] of subjectChapterPlans) {
    const dailyMin = configMap.get(subjId) ?? DEFAULT_DAILY_MINUTES;

    for (const ch of chapterPlans) {
      const topicsPerDay = Math.ceil(ch.topics.length / ch.allocatedDays);
      const minutesPerTopic = Math.max(5, Math.round(dailyMin / Math.max(topicsPerDay, 1)));
      let cursor = 0;

      for (let d = 0; d < ch.allocatedDays && cursor < ch.topics.length; d++) {
        const dayTopics = ch.topics.slice(cursor, cursor + topicsPerDay);
        cursor += dayTopics.length;
        planRows.push({
          test_id: testId,
          day_date: fmtLocalDate(addDays(startDate, ch.startDay + d)),
          chapter_id: ch.chapter_id,
          topics: dayTopics,
          estimated_minutes: Math.min(dayTopics.length * minutesPerTopic, dailyMin),
        });
      }
    }
  }

  // Step 4 — revision sessions in the final revDays days
  for (let r = 0; r < revDays; r++) {
    const revDate = fmtLocalDate(addDays(startDate, studyDays + r));
    for (const [subjId, chapterPlans] of subjectChapterPlans) {
      const dailyMin = configMap.get(subjId) ?? DEFAULT_DAILY_MINUTES;
      const minPerChapter = Math.max(10, Math.round(dailyMin / chapterPlans.length));
      for (const ch of chapterPlans) {
        planRows.push({
          test_id: testId,
          day_date: revDate,
          chapter_id: ch.chapter_id,
          topics: ['🔁 Full chapter revision'],
          estimated_minutes: minPerChapter,
        });
      }
    }
  }

  if (planRows.length) {
    await admin.from('study_plans').insert(planRows);
  }
}
