'use client';

import { useState } from 'react';
import { RefreshCw, Sparkles, Flame, Trophy, BarChart2, Target,
  BookOpen, AlertTriangle, TrendingUp, TrendingDown, Minus, CheckCircle2, Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type KPIData } from '@/components/parent/KPIGrid';
import { SubjectMasteryChart, type SubjectData } from '@/components/parent/SubjectMasteryChart';
import { QuizTrendChart, type QuizTrendPoint } from '@/components/parent/QuizTrendChart';
import { WeakTopicsPanel, type WeakChapter } from '@/components/parent/WeakTopicsPanel';
import { ExamReadinessGauge } from '@/components/parent/ExamReadinessGauge';
import { SwotPanel } from '@/components/parent/SwotPanel';
import { RecommendationsPanel } from '@/components/parent/RecommendationsPanel';
import type { ParentInsight } from '@/lib/ai/parent-insights';

interface GiftMilestone {
  xp_milestone: number;
  voucher_inr: number;
  gifted_at: string;
  voucher_code: string | null;
  availed_at: string | null;
}

export interface StudentPerformanceProps {
  student: { id: string; name: string; grade: number; board: string };
  kpi: KPIData;
  subjects: SubjectData[];
  quizTrend: QuizTrendPoint[];
  weakChapters: WeakChapter[];
  weakSubjects: string[];
  initialInsights: ParentInsight | null;
  insightsGeneratedAt: string | null;
  milestones: GiftMilestone[];
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
        <span className="text-gray-500">{icon}</span>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-black text-gray-900 leading-tight">{value}</div>
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function ActivityLog({ points }: { points: QuizTrendPoint[] }) {
  const cutoff = Date.now() - 7 * 86400000;
  const sorted = [...points]
    .filter(p => new Date(p.date).getTime() >= cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const seen = new Set<string>();
  const recent = sorted.filter(p => {
    const key = `${p.subject}__${p.chapter_name ?? p.subject}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);

  if (recent.length === 0) {
    return <div className="text-sm text-gray-400 py-4 text-center">No study activity this week.</div>;
  }

  return (
    <div className="space-y-2">
      {recent.map((p, i) => {
        const label = p.chapter_name ?? p.subject;
        const score = p.score_pct;
        const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-50' : score >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50';
        const dateStr = new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
              <p className="text-[11px] text-gray-400">{p.subject} · {dateStr}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>{score}%</span>
          </div>
        );
      })}
    </div>
  );
}

function InsightTagRow({ tag, items, tagColor }: { tag: string; items: string[]; tagColor: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1">
      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${tagColor}`}>
        {tag}
      </span>
      <ul className="space-y-1 pl-1">
        {items.slice(0, 2).map((item, i) => (
          <li key={i} className="text-xs text-gray-700 leading-snug">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function StudentInsightRefreshButton({ onRefreshed }: { onRefreshed: (ins: ParentInsight, at: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/student/insights', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.insights) onRefreshed(data.insights, data.generated_at);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={refresh}
      disabled={loading}
      className="gap-1.5 text-violet-700 border-violet-200 hover:bg-violet-50 text-xs"
    >
      {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {loading ? 'Generating…' : 'Refresh AI Insights'}
    </Button>
  );
}

export function StudentPerformanceClient({
  student, kpi, subjects, quizTrend, weakChapters, weakSubjects,
  initialInsights, insightsGeneratedAt, milestones,
}: StudentPerformanceProps) {
  const [insights, setInsights] = useState<ParentInsight | null>(initialInsights);
  const [insightsAt, setInsightsAt] = useState<string | null>(insightsGeneratedAt);

  const performanceValue = kpi.overall_quiz_avg !== null ? `${kpi.overall_quiz_avg}%` : '—';
  const improvementValue = kpi.weekly_improvement !== null
    ? `${kpi.weekly_improvement > 0 ? '+' : ''}${kpi.weekly_improvement}%`
    : '—';
  const improvementIconColor = kpi.weekly_improvement === null ? 'text-gray-400'
    : kpi.weekly_improvement > 0 ? 'text-emerald-600'
    : kpi.weekly_improvement < 0 ? 'text-red-500' : 'text-gray-400';
  const improvementIcon = kpi.weekly_improvement !== null && kpi.weekly_improvement > 0
    ? <TrendingUp className={`h-4 w-4 ${improvementIconColor}`} />
    : kpi.weekly_improvement !== null && kpi.weekly_improvement < 0
    ? <TrendingDown className={`h-4 w-4 ${improvementIconColor}`} />
    : <Minus className={`h-4 w-4 ${improvementIconColor}`} />;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-black text-gray-900">My Performance</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your strengths, focus areas, and progress at a glance</p>
      </div>

      {/* Student info bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-5 py-4 text-white flex items-center gap-4 flex-wrap">
        <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl shrink-0">
          {student.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-base">{student.name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Class {student.grade}</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{student.board}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm shrink-0">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-yellow-300" />
            <span className="font-bold">Lvl {kpi.level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-yellow-200" />
            <span className="font-bold">{kpi.total_xp.toLocaleString()} XP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-300" />
            <span className="font-bold">{kpi.current_streak}-day streak</span>
          </div>
        </div>
      </div>

      {/* Voucher status banners */}
      {milestones.map(m => {
        if (m.availed_at) {
          return (
            <div key={m.xp_milestone} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-800 font-medium">
                You earned a <span className="font-bold">₹{m.voucher_inr} Amazon Voucher</span> and have already availed it on{' '}
                {new Date(m.availed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Great work!
              </p>
            </div>
          );
        }
        if (m.voucher_code) {
          return (
            <div key={m.xp_milestone} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <Gift className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                You have a <span className="font-bold">₹{m.voucher_inr} Amazon Voucher</span> waiting! Go to{' '}
                <a href="/rewards" className="underline font-bold">Refer &amp; Earn</a> to copy the code and mark it as used.
              </p>
            </div>
          );
        }
        return (
          <div key={m.xp_milestone} className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <Gift className="h-4 w-4 text-blue-400 shrink-0" />
            <p className="text-sm text-blue-800 font-medium">
              You&apos;re eligible for a <span className="font-bold">₹{m.voucher_inr} Amazon Voucher</span> — your code is being processed and will appear in{' '}
              <a href="/rewards" className="underline font-bold">Refer &amp; Earn</a> soon.
            </p>
          </div>
        );
      })}

      {/* 5 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Performance Score"
          value={performanceValue}
          sub={kpi.overall_quiz_avg !== null ? 'Overall quiz avg' : 'No quizzes yet'}
          color="bg-indigo-100"
          icon={<BarChart2 className="h-4 w-4 text-indigo-600" />}
        />
        <KpiCard
          label="Weekly Improvement"
          value={improvementValue}
          sub="vs. last week"
          color={kpi.weekly_improvement !== null && kpi.weekly_improvement >= 0 ? 'bg-emerald-100' : 'bg-red-100'}
          icon={improvementIcon}
        />
        <KpiCard
          label="Study Consistency"
          value={`${kpi.consistency_pct}%`}
          sub={`${kpi.active_days_last_30} active days / 30`}
          color="bg-violet-100"
          icon={<CheckCircle2 className="h-4 w-4 text-violet-600" />}
        />
        <KpiCard
          label="Exam Readiness"
          value={`${kpi.exam_readiness_pct}%`}
          sub={`${kpi.chapters_mastered}/${kpi.chapters_total} chapters mastered`}
          color="bg-amber-100"
          icon={<Target className="h-4 w-4 text-amber-600" />}
        />
        <KpiCard
          label="Study Streak"
          value={`${kpi.current_streak}d`}
          sub="consecutive days"
          color="bg-orange-100"
          icon={<Flame className="h-4 w-4 text-orange-500" />}
        />
      </div>

      {/* Two-column: activity log + AI insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-800">What I Studied This Week</h2>
          </div>
          <div className="p-5">
            <ActivityLog points={quizTrend} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-bold text-gray-800">My AI Insights</h2>
            </div>
            <StudentInsightRefreshButton onRefreshed={(ins, at) => { setInsights(ins); setInsightsAt(at); }} />
          </div>
          <div className="p-5">
            {insights ? (
              <div className="space-y-3">
                <InsightTagRow tag="Your Strengths" items={insights.strengths} tagColor="bg-emerald-100 text-emerald-700" />
                <InsightTagRow tag="Focus Areas" items={insights.weaknesses} tagColor="bg-amber-100 text-amber-700" />
                <InsightTagRow tag="Tips for You" items={insights.opportunities} tagColor="bg-blue-100 text-blue-700" />
                {insights.recommendations && insights.recommendations.length > 0 && (
                  <InsightTagRow tag="Next Steps" items={insights.recommendations.slice(0, 2)} tagColor="bg-violet-100 text-violet-700" />
                )}
                {insightsAt && (
                  <p className="text-[10px] text-gray-300 pt-1">
                    Updated {new Date(insightsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-gray-500">Generate AI insights to see personalised tips just for you.</p>
                <StudentInsightRefreshButton onRefreshed={(ins, at) => { setInsights(ins); setInsightsAt(at); }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed sections */}
      <Section title="Subject Performance" icon={<BarChart2 className="h-4 w-4" />}>
        <SubjectMasteryChart subjects={subjects} />
      </Section>

      <Section title="Exam Readiness" icon={<Target className="h-4 w-4" />}>
        <ExamReadinessGauge
          readiness_pct={kpi.exam_readiness_pct}
          student_name={student.name}
          weak_subjects={weakSubjects}
          studentView
        />
      </Section>

      <Section title="Quiz Score Trend (Last 60 Days)" icon={<BarChart2 className="h-4 w-4" />}>
        <QuizTrendChart points={quizTrend} />
      </Section>

      <Section title="Chapters Needing Attention" icon={<AlertTriangle className="h-4 w-4" />}>
        <WeakTopicsPanel chapters={weakChapters} studentView />
      </Section>

      <Section title="AI Learning Report (SWOT)" icon={<Sparkles className="h-4 w-4" />}>
        {insights ? (
          <SwotPanel insights={insights} generatedAt={insightsAt!} />
        ) : (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-gray-500">No AI insights generated yet.</p>
            <StudentInsightRefreshButton onRefreshed={(ins, at) => { setInsights(ins); setInsightsAt(at); }} />
          </div>
        )}
      </Section>

      {insights?.recommendations && insights.recommendations.length > 0 && (
        <Section title="AI Recommendations" icon={<BookOpen className="h-4 w-4" />}>
          <RecommendationsPanel recommendations={insights.recommendations} />
        </Section>
      )}

      <p className="text-center text-xs text-gray-300 pb-4">
        Powered by EaseStudy AI · Data refreshes on every visit
      </p>
    </div>
  );
}
