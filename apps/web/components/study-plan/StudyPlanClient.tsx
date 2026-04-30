'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  CalendarCheck, Clock, CheckCircle2, Loader2,
  RefreshCw, BookOpen, ArrowLeft,
} from 'lucide-react';

interface SubjectInfo { id: string; name: string }

interface Plan {
  id: string;
  day_date: string;
  chapter_id: string;
  topics: string[];
  estimated_minutes: number;
  is_completed: boolean;
  chapter: {
    id: string;
    name: string;
    complexity_score: number | null;
    subjects: SubjectInfo | null;
  } | null;
}

interface Test {
  id: string;
  name: string;
  test_date: string;
  plan_start_date?: string | null;
}

interface Props { test: Test; plans: Plan[]; daysRemaining: number }

// ── Helpers ──────────────────────────────────────────────────────────────────

function urgencyColor(days: number) {
  if (days <= 1) return 'text-red-600';
  if (days <= 3) return 'text-amber-600';
  return 'text-green-600';
}
function urgencyBg(days: number) {
  if (days <= 1) return 'bg-red-50 border-red-200';
  if (days <= 3) return 'bg-amber-50 border-amber-200';
  return 'bg-green-50 border-green-200';
}
function isToday(d: string) {
  return new Date(d).toDateString() === new Date().toDateString();
}
function isPast(d: string) {
  const dt = new Date(d); dt.setHours(23, 59, 59, 999);
  return dt < new Date();
}

// Colour stripe per subject (cycles through a palette)
const SUBJECT_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
];
const SUBJECT_LIGHT = [
  'bg-blue-50 border-blue-100', 'bg-violet-50 border-violet-100',
  'bg-emerald-50 border-emerald-100', 'bg-amber-50 border-amber-100',
  'bg-rose-50 border-rose-100', 'bg-cyan-50 border-cyan-100',
];
const SUBJECT_TEXT = [
  'text-blue-700', 'text-violet-700', 'text-emerald-700',
  'text-amber-700', 'text-rose-700', 'text-cyan-700',
];

// ── Component ─────────────────────────────────────────────────────────────────

export function StudyPlanClient({ test, plans: initialPlans, daysRemaining }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [completing, setCompleting] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Sync from server whenever initialPlans changes (after router.refresh)
  useEffect(() => {
    if (initialPlans.length > 0) setPlans(initialPlans);
  }, [initialPlans]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll while plan is still being generated in the background
  useEffect(() => {
    if (plans.length > 0 || regenerating) return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      router.refresh();
      if (attempts >= 15) clearInterval(id); // stop after ~60 s
    }, 4000);
    return () => clearInterval(id);
  }, [plans.length, regenerating, router]);

  // Stable subject-colour index
  const subjectColorIndex = (() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const p of plans) {
      const sid = p.chapter?.subjects?.id ?? p.chapter_id;
      if (!map.has(sid)) map.set(sid, idx++ % SUBJECT_COLORS.length);
    }
    return map;
  })();

  const completed = plans.filter(p => p.is_completed).length;
  const totalMinutes = plans.reduce((s, p) => s + p.estimated_minutes, 0);
  const completedMinutes = plans.filter(p => p.is_completed).reduce((s, p) => s + p.estimated_minutes, 0);
  const progressPercent = plans.length > 0 ? Math.round((completed / plans.length) * 100) : 0;

  // Group by date, then by subject within each date
  type SubjectGroup = { subjectId: string; subjectName: string; colorIdx: number; plans: Plan[] };
  type DayGroup = { date: string; subjectGroups: SubjectGroup[]; totalMin: number };

  const dayGroups: DayGroup[] = (() => {
    const byDate = new Map<string, Map<string, SubjectGroup>>();

    for (const p of plans) {
      if (!byDate.has(p.day_date)) byDate.set(p.day_date, new Map());
      const sid = p.chapter?.subjects?.id ?? p.chapter_id;
      const sName = p.chapter?.subjects?.name ?? 'Other';
      const dayMap = byDate.get(p.day_date)!;
      if (!dayMap.has(sid)) {
        dayMap.set(sid, {
          subjectId: sid,
          subjectName: sName,
          colorIdx: subjectColorIndex.get(sid) ?? 0,
          plans: [],
        });
      }
      dayMap.get(sid)!.plans.push(p);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, subjMap]) => {
        const subjectGroups = [...subjMap.values()];
        const totalMin = subjectGroups.reduce(
          (s, sg) => s + sg.plans.reduce((ss, p) => ss + p.estimated_minutes, 0), 0
        );
        return { date, subjectGroups, totalMin };
      });
  })();

  async function togglePlan(planId: string, current: boolean) {
    setCompleting(planId);
    const res = await fetch(`/api/study-plan/${test.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, is_completed: !current }),
    });
    if (res.ok) {
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, is_completed: !current } : p));
    } else {
      toast.error('Failed to update');
    }
    setCompleting(null);
  }

  async function regeneratePlan() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/study-plan/${test.id}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Regeneration failed');
      } else {
        toast.success('Plan regenerated!');
        setPlans([]);    // show loading state while server refreshes
        router.refresh();
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setRegenerating(false);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Back link */}
      <Link
        href="/tests"
        className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Study Planner
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{test.name}</h1>
          <p className="text-gray-500 text-sm">
            <span className="text-gray-400 text-xs">Exam date: </span>
            {new Date(test.test_date).toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
          {test.plan_start_date && (
            <p className="text-gray-500 text-sm">
              <span className="text-gray-400 text-xs">Plan starts: </span>
              {new Date(test.plan_start_date).toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={`text-right px-4 py-2 rounded-xl border ${urgencyBg(daysRemaining)}`}>
            <p className={`text-2xl font-bold ${urgencyColor(daysRemaining)}`}>
              {Math.max(0, daysRemaining)}
            </p>
            <p className="text-xs text-gray-500">days left from today</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={regeneratePlan}
            disabled={regenerating}
            className="gap-1.5 text-xs"
          >
            {regenerating
              ? <><Loader2 className="h-3 w-3 animate-spin" />Regenerating…</>
              : <><RefreshCw className="h-3 w-3" />Regenerate Plan</>}
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Overall Progress</p>
            <p className="text-sm text-gray-500">
              {completed}/{plans.length} sessions · {completedMinutes}/{totalMinutes} min
            </p>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          <p className="text-xs text-gray-400 mt-1 text-right">{progressPercent}% complete</p>
        </CardContent>
      </Card>

      {/* Day-by-day plan */}
      {dayGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          {regenerating ? (
            <>
              <p className="font-medium">Generating your plan…</p>
              <p className="text-sm">This usually takes 15–30 seconds.</p>
            </>
          ) : (
            <>
              <p className="font-medium">Study plan is being generated…</p>
              <p className="text-sm">Refresh in a moment to see your schedule.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {dayGroups.map(({ date, subjectGroups, totalMin }) => {
            const todayDay = isToday(date);
            const pastDay = isPast(date);
            const allDone = subjectGroups.every(sg => sg.plans.every(p => p.is_completed));
            const dayDate = new Date(date);

            return (
              <Card
                key={date}
                className={`border ${todayDay ? 'border-blue-300 ring-1 ring-blue-200' : ''} ${pastDay && !allDone ? 'opacity-70' : ''}`}
              >
                {/* Day header */}
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${todayDay ? 'bg-blue-600 text-white' : pastDay ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-600'}`}>
                        <CalendarCheck className="h-3.5 w-3.5" />
                      </div>
                      <p className={`text-sm font-semibold ${todayDay ? 'text-blue-700' : 'text-gray-900'}`}>
                        {todayDay ? 'Today — ' : ''}
                        {dayDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />{totalMin} min total
                      </span>
                      {allDone && (
                        <Badge className="bg-green-500 text-white text-xs gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />Done
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Subject blocks within the day */}
                <CardContent className="px-4 pb-3 space-y-3">
                  {subjectGroups.map(sg => {
                    const ci = sg.colorIdx;
                    const subjectDone = sg.plans.every(p => p.is_completed);
                    const subjectMin = sg.plans.reduce((s, p) => s + p.estimated_minutes, 0);

                    return (
                      <div key={sg.subjectId} className={`rounded-lg border overflow-hidden ${SUBJECT_LIGHT[ci]}`}>
                        {/* Subject label */}
                        <div className={`flex items-center gap-2 px-3 py-2 ${SUBJECT_LIGHT[ci]}`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${SUBJECT_COLORS[ci]}`} />
                          <span className={`text-xs font-semibold uppercase tracking-wide ${SUBJECT_TEXT[ci]}`}>
                            {sg.subjectName}
                          </span>
                          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-2.5 w-2.5" />{subjectMin} min
                          </span>
                          {subjectDone && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                        </div>

                        {/* Chapter sessions */}
                        <div className="divide-y divide-white/60">
                          {sg.plans.map(plan => (
                            <div
                              key={plan.id}
                              className={`flex items-start gap-3 px-3 py-2.5 ${plan.is_completed ? 'bg-green-50' : 'bg-white/70'}`}
                            >
                              <Checkbox
                                checked={plan.is_completed}
                                disabled={completing === plan.id}
                                onCheckedChange={() => togglePlan(plan.id, plan.is_completed)}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`text-sm font-medium ${plan.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                    <BookOpen className="inline h-3 w-3 mr-1 text-gray-400" />
                                    {plan.chapter?.name ?? 'Chapter'}
                                  </p>
                                  <span className="text-xs text-gray-400">{plan.estimated_minutes} min</span>
                                </div>
                                {plan.topics.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {plan.topics.map(t => (
                                      <Badge key={t} variant="secondary" className="text-xs font-normal">
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
