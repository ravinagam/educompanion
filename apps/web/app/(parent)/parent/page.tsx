import { redirect } from 'next/navigation';
import { createParentServerClient } from '@/lib/supabase/parent-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/parent-auth';
import { ChildrenGrid } from '@/components/parent/ChildrenGrid';

export default async function ParentHomePage() {
  const supabase = await createParentServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/parent-login');

  const parentPhone = normalizePhone(user.user_metadata?.phone ?? '');
  const admin = createAdminClient();

  // Find all students whose phone_number digits match the parent's phone
  const { data: allStudents } = await admin
    .from('users')
    .select('id, name, grade, board, phone_number');

  const children = (allStudents ?? []).filter(s => {
    const digits = normalizePhone(s.phone_number ?? '');
    return digits && digits === parentPhone;
  });

  if (children.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-gray-800">No students found</h2>
        <p className="text-gray-500 max-w-sm mx-auto text-sm">
          We couldn&apos;t find any student account linked to your phone number.
          Ask your child to open their EaseStudy Profile and add your phone number.
        </p>
      </div>
    );
  }

  // Fetch lightweight preview data for each child
  const childIds = children.map(c => c.id);

  const [{ data: gamifications }, { data: masteryRows }, { data: recentQuizzes }] = await Promise.all([
    admin.from('user_gamification').select('user_id, total_xp, level, current_streak, last_active_date').in('user_id', childIds),
    admin.from('chapter_mastery').select('user_id, chapter_id, mastered').in('user_id', childIds),
    admin.from('quiz_attempts')
      .select('user_id, score, total, taken_at')
      .in('user_id', childIds)
      .order('taken_at', { ascending: false })
      .limit(50),
  ]);

  const childPreviews = children.map(child => {
    const gami = gamifications?.find(g => g.user_id === child.id);
    const mastery = masteryRows?.filter(m => m.user_id === child.id) ?? [];
    const quizzes = recentQuizzes?.filter(q => q.user_id === child.id) ?? [];
    const lastQuiz = quizzes[0];
    const lastScore = lastQuiz && lastQuiz.total > 0
      ? Math.round((lastQuiz.score / lastQuiz.total) * 100)
      : null;
    const daysSinceActive = gami?.last_active_date
      ? Math.floor((Date.now() - new Date(gami.last_active_date).getTime()) / 86400000)
      : null;

    return {
      id: child.id,
      name: child.name,
      grade: child.grade,
      board: child.board,
      total_xp: gami?.total_xp ?? 0,
      level: gami?.level ?? 1,
      current_streak: gami?.current_streak ?? 0,
      chapters_mastered: mastery.filter(m => m.mastered).length,
      chapters_total: mastery.length,
      last_quiz_score_pct: lastScore,
      days_since_active: daysSinceActive,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Children</h1>
        <p className="text-gray-500 text-sm mt-1">Select a child to view their detailed progress report.</p>
      </div>
      <ChildrenGrid children={childPreviews} />
    </div>
  );
}
