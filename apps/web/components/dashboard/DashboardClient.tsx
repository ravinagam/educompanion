'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CalendarCheck, Trophy, BookOpen, Clock,
  TrendingUp, AlertCircle, CheckCircle2, BookMarked
} from 'lucide-react';

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
}

interface Props {
  userId: string;
  todayPlans: StudyPlan[];
  upcomingTests: UpcomingTest[];
  recentAttempts: RecentAttempt[];
}

function urgencyBadge(days: number) {
  if (days <= 1) return <Badge variant="destructive">🔴 Urgent</Badge>;
  if (days <= 3) return <Badge className="bg-amber-500 text-white">🟡 Soon</Badge>;
  return <Badge className="bg-green-500 text-white">🟢 On Track</Badge>;
}

export function DashboardClient({ todayPlans, upcomingTests, recentAttempts }: Props) {
  const completedToday = todayPlans.filter(p => p.is_completed).length;
  const totalToday = todayPlans.length;
  const todayPercent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-6 py-5 text-white shadow-md">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-blue-100 text-sm mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Today's Progress */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <CalendarCheck className="h-4 w-4" />
            Today&apos;s Study Plan
          </div>
          <span className="text-blue-100 text-xs font-medium">{completedToday}/{totalToday} done</span>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={todayPercent} className="flex-1 h-2.5" />
            <span className="text-sm font-semibold text-indigo-700">{todayPercent}%</span>
          </div>

          {todayPlans.length === 0 ? (
            <div className="text-center py-6 bg-blue-50 rounded-xl">
              <BookMarked className="h-8 w-8 text-blue-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No study plan for today.</p>
              <Link href="/tests">
                <Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white">Create a Study Plan</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todayPlans.map(plan => (
                <div key={plan.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-opacity ${
                  plan.is_completed ? 'bg-green-50 border-green-100 opacity-70' : 'bg-white border-gray-100'
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
                      {plan.topics.slice(0, 2).join(' · ')}
                      {plan.topics.length > 2 && ' …'}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Tests */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center gap-2 text-white font-semibold text-sm">
            <AlertCircle className="h-4 w-4" />
            Upcoming Tests
          </div>
          <CardContent className="p-4">
            {upcomingTests.length === 0 ? (
              <div className="text-center py-6 bg-amber-50 rounded-xl">
                <p className="text-sm text-gray-500">No upcoming tests scheduled.</p>
                <Link href="/tests">
                  <Button size="sm" className="mt-2 bg-amber-500 hover:bg-amber-600 text-white">Schedule a Test</Button>
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
                          Exam date: {new Date(test.test_date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })} · {test.days_remaining} days left from today
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
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 flex items-center gap-2 text-white font-semibold text-sm">
            <Trophy className="h-4 w-4" />
            Recent Quiz Scores
          </div>
          <CardContent className="p-4">
            {recentAttempts.length === 0 ? (
              <div className="text-center py-6 bg-violet-50 rounded-xl">
                <p className="text-sm text-gray-500">No quiz attempts yet.</p>
                <Link href="/upload">
                  <Button size="sm" className="mt-2 bg-violet-600 hover:bg-violet-700 text-white">Upload a Chapter</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttempts.slice(0, 5).map(attempt => {
                  const pct = Math.round((attempt.score / attempt.total) * 100);
                  const scoreColor = pct >= 70 ? 'text-green-700 bg-green-100' : pct >= 50 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100';
                  return (
                    <div key={attempt.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-violet-50 border border-violet-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{attempt.chapter_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={pct} className="flex-1 h-1.5" />
                          <span className="text-xs text-gray-500 shrink-0">{attempt.score}/{attempt.total}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${scoreColor}`}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-gray-700">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/upload', icon: BookOpen, label: 'Upload Chapter', bg: 'bg-gradient-to-br from-blue-500 to-cyan-500', shadow: 'shadow-blue-200' },
              { href: '/tests', icon: CalendarCheck, label: 'New Study Plan', bg: 'bg-gradient-to-br from-violet-500 to-purple-600', shadow: 'shadow-violet-200' },
              { href: '/chapters', icon: BookMarked, label: 'My Chapters', bg: 'bg-gradient-to-br from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
              { href: '/tests', icon: Trophy, label: 'Take a Quiz', bg: 'bg-gradient-to-br from-amber-400 to-orange-500', shadow: 'shadow-amber-200' },
            ].map(({ href, icon: Icon, label, bg, shadow }) => (
              <Link key={href + label} href={href}>
                <div className={`flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer text-white shadow-md ${shadow} ${bg} hover:opacity-90 transition-opacity`}>
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-semibold text-center leading-tight">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
