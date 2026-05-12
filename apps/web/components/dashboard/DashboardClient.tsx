'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CalendarCheck, Trophy, Clock,
  AlertCircle, CheckCircle2, BookMarked,
  Flame, ArrowRight, TrendingUp, Layers, Zap,
} from 'lucide-react';
import { calculateLevel, xpForLevel, xpForNextLevel, streakMultiplierLabel } from '@/lib/gamification';

interface StudyPlan {
  id: string;
  day_date: string;
  chapter_id: string;
  topics: string[];
  estimated_minutes: number;
  is_completed: boolean;
  chapter: { id: string; name: string; subjects: { name: string } | null } | null;
  test: { id: string; name: string; test_date: string } | null;
}

interface UpcomingTest {
  id: string;
  name: string;
  test_date: string;
  days_remaining: number;
}

interface RecentAttempt {
  id: string;
  score: number;
  total: number;
  taken_at: string;
  chapter_name: string;
  subject_name: string;
  difficulty: string;
}

interface ChapterProgress {
  id: string;
  name: string;
  section_total: number;
  section_completed: number;
}

interface Props {
  userId: string;
  userName: string;
  todayPlans: StudyPlan[];
  upcomingTests: UpcomingTest[];
  recentAttempts: RecentAttempt[];
  nextReward: { label: string; xpNeeded: number; xpTotal: number } | null;
  gamification: { total_xp: number; level: number; current_streak: number } | null;
  flashcardsKnown: number;
  quizAvg: number;
  chapterProgress: ChapterProgress[];
}

function urgencyBadge(days: number) {
  if (days <= 1) return <Badge variant="destructive">Urgent</Badge>;
  if (days <= 3) return <Badge className="bg-amber-500 text-white">Soon</Badge>;
  return <Badge className="bg-green-500 text-white">On Track</Badge>;
}

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${name.split(' ')[0]}!`;
}

const CHAPTER_BAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500',
];

export function DashboardClient({
  userName, todayPlans, upcomingTests, recentAttempts,
  nextReward, gamification, flashcardsKnown, quizAvg, chapterProgress,
}: Props) {
  const completedToday = todayPlans.filter(p => p.is_completed).length;
  const totalToday = todayPlans.length;
  const todayPercent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const totalXp = gamification?.total_xp ?? 0;
  const level = gamification?.level ?? calculateLevel(totalXp);
  const streak = gamification?.current_streak ?? 0;
  const levelXpStart = xpForLevel(level);
  const levelXpEnd = xpForNextLevel(level);
  const xpInLevel = totalXp - levelXpStart;
  const xpNeededInLevel = levelXpEnd - levelXpStart;
  const levelPct = xpNeededInLevel > 0 ? Math.round((xpInLevel / xpNeededInLevel) * 100) : 100;
  const streakLabel = streakMultiplierLabel(streak);

  const nudgeChapter = chapterProgress.find(
    c => c.section_completed > 0 && c.section_completed < c.section_total
  ) ?? chapterProgress.find(c => c.section_completed === 0);

  return (
    <div className="space-y-5">

      {/* ── Greeting banner ── */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 text-white shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{greeting(userName)}</h1>
        <p className="text-indigo-200 text-sm mt-0.5">
          {streak >= 3
            ? <>
                <Flame className="inline h-3.5 w-3.5 text-orange-300 mr-0.5 -mt-0.5" />
                {streak}-day streak active
                {streakLabel ? ` — ${streakLabel} XP boost on every activity` : ''}
              </>
            : `${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        </p>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Level</p>
            <p className="text-2xl font-bold text-indigo-600 leading-tight">{level}</p>
            <p className="text-xs text-gray-400">{totalXp.toLocaleString()} XP total</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Streak</p>
            <p className="text-2xl font-bold text-orange-500 leading-tight flex items-center gap-1">
              <Flame className="h-5 w-5 text-orange-400 shrink-0" />{streak}
            </p>
            <p className="text-xs text-gray-400">{streak === 1 ? 'day' : 'days'} in a row</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Quiz Avg</p>
            <p className="text-2xl font-bold text-violet-600 leading-tight">{quizAvg}<span className="text-base font-medium text-gray-400">%</span></p>
            <p className="text-xs text-gray-400">across all quizzes</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Flashcards</p>
            <p className="text-2xl font-bold text-emerald-600 leading-tight">{flashcardsKnown}</p>
            <p className="text-xs text-gray-400">cards known</p>
          </CardContent>
        </Card>
      </div>

      {/* ── XP + Milestone ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* XP Progress */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-indigo-500" />
                <p className="text-sm font-semibold text-gray-900">XP Progress to Level {level + 1}</p>
              </div>
              {streakLabel && (
                <span className="text-xs font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                  {streakLabel} streak boost
                </span>
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-1.5">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.min(levelPct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{xpInLevel.toLocaleString()} / {xpNeededInLevel.toLocaleString()} XP</span>
              <span>{Math.max(0, levelXpEnd - totalXp).toLocaleString()} XP to go</span>
            </div>
          </CardContent>
        </Card>

        {/* Milestone */}
        {nextReward ? (
          <Card className="border border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-sm font-semibold text-gray-900">Next Reward Milestone</p>
                </div>
                <span className="text-xs font-bold text-amber-700">{nextReward.label}</span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden mb-1.5">
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(Math.round((totalXp / nextReward.xpTotal) * 100), 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-amber-600">
                <span>{totalXp.toLocaleString()} / {nextReward.xpTotal.toLocaleString()} XP</span>
                <span>{nextReward.xpNeeded.toLocaleString()} XP to go</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-emerald-200 bg-emerald-50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <Trophy className="h-9 w-9 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">All milestones claimed!</p>
                <p className="text-xs text-gray-500 mt-0.5">You&apos;ve earned every reward. Keep it up.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Chapter Progress ── */}
      {chapterProgress.length > 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Chapter Progress</p>
          </div>
          <CardContent className="p-5 space-y-4">
            {chapterProgress.map((c, i) => {
              const pct = c.section_total > 0 ? Math.round((c.section_completed / c.section_total) * 100) : 0;
              const barColor = CHAPTER_BAR_COLORS[i % CHAPTER_BAR_COLORS.length];
              return (
                <div key={c.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <Link href={`/chapters/${c.id}/sections`} className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors truncate max-w-[75%]">
                      {c.name}
                    </Link>
                    <span className="text-xs text-gray-400 shrink-0 ml-2 tabular-nums">
                      {c.section_completed}/{c.section_total} sections
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Study Nudge ── */}
      {nudgeChapter && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">Study Nudge</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{nudgeChapter.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {nudgeChapter.section_completed > 0
                ? `Section ${nudgeChapter.section_completed + 1} of ${nudgeChapter.section_total}`
                : 'Start your first section'}
              {' · '}Take the quiz after to earn bonus XP
            </p>
          </div>
          <Link href={`/chapters/${nudgeChapter.id}/sections`} className="shrink-0">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── Today's Study Plan ── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <CalendarCheck className="h-4 w-4" />
            Today&apos;s Study Plan
          </div>
          <span className="text-blue-100 text-xs font-medium">{completedToday}/{totalToday} done</span>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={todayPercent} className="flex-1 h-2" />
            <span className="text-sm font-semibold text-indigo-600 w-10 text-right">{todayPercent}%</span>
          </div>
          {todayPlans.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <BookMarked className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No study plan for today.</p>
              <Link href="/tests">
                <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 text-white">Create a Study Plan</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todayPlans.map(plan => (
                <div key={plan.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-opacity ${
                  plan.is_completed ? 'bg-green-50 border-green-100 opacity-60' : 'bg-white border-gray-100'
                }`}>
                  {plan.is_completed
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    : <Clock className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${plan.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {plan.chapter?.subjects?.name
                        ? `${plan.chapter.subjects.name} — ${plan.chapter.name}`
                        : plan.chapter?.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {plan.topics.slice(0, 2).join(' · ')}{plan.topics.length > 2 && ' …'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{plan.estimated_minutes}m</span>
                    {plan.test && (
                      <Link href={`/study-plan/${plan.test.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-800">View →</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Upcoming Tests */}
        <Card className="border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center gap-2 text-white font-semibold text-sm">
            <AlertCircle className="h-4 w-4" />
            Upcoming Tests
          </div>
          <CardContent className="p-4">
            {upcomingTests.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-400">No upcoming tests scheduled.</p>
                <Link href="/tests">
                  <Button size="sm" className="mt-3 bg-amber-500 hover:bg-amber-600 text-white">Schedule a Test</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTests.map(test => (
                  <div key={test.id} className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{test.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(test.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}{test.days_remaining} days left
                        </p>
                      </div>
                      {urgencyBadge(test.days_remaining)}
                    </div>
                    <Link href={`/study-plan/${test.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs mt-1 pl-0 text-amber-700 hover:text-amber-900">
                        View Study Plan →
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scores */}
        <Card className="border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 flex items-center gap-2 text-white font-semibold text-sm">
            <Trophy className="h-4 w-4" />
            Recent Quiz Scores
          </div>
          <CardContent className="p-4">
            {recentAttempts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Layers className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No quiz attempts yet.</p>
                <Link href="/upload">
                  <Button size="sm" className="mt-3 bg-violet-600 hover:bg-violet-700 text-white">Upload a Chapter</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentAttempts.slice(0, 5).map(attempt => {
                  const pct = Math.round((attempt.score / attempt.total) * 100);
                  const scoreColor = pct >= 70 ? 'text-green-700 bg-green-100' : pct >= 50 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100';
                  const diff = attempt.difficulty ?? 'medium';
                  const diffColor = diff === 'easy' ? 'bg-green-100 text-green-700' : diff === 'hard' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                  return (
                    <div key={attempt.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-violet-50 border border-violet-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">{attempt.chapter_name}</p>
                          {attempt.subject_name && (
                            <span className="text-xs text-violet-500 font-medium shrink-0">· {attempt.subject_name}</span>
                          )}
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${diffColor}`}>
                            {diff.charAt(0).toUpperCase() + diff.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={pct} className="flex-1 h-1.5" />
                          <span className="text-xs text-gray-400 shrink-0 tabular-nums">{attempt.score}/{attempt.total}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 tabular-nums ${scoreColor}`}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
