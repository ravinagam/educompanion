'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Flame, Trophy, Clock, Sparkles, BarChart2, Target, BookOpen, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { KPIGrid, type KPIData } from './KPIGrid';
import { SubjectMasteryChart, type SubjectData } from './SubjectMasteryChart';
import { QuizTrendChart, type QuizTrendPoint } from './QuizTrendChart';
import { WeakTopicsPanel, type WeakChapter } from './WeakTopicsPanel';
import { ExamReadinessGauge } from './ExamReadinessGauge';
import { SwotPanel } from './SwotPanel';
import { RecommendationsPanel } from './RecommendationsPanel';
import { AlertsPanel } from './AlertsPanel';
import { InsightRefreshButton } from './InsightRefreshButton';
import type { ParentInsight } from '@/lib/ai/parent-insights';

export interface ParentDashboardProps {
  student: { id: string; name: string; grade: number; board: string };
  kpi: KPIData;
  subjects: SubjectData[];
  quizTrend: QuizTrendPoint[];
  weakChapters: WeakChapter[];
  weakSubjects: string[];
  initialInsights: ParentInsight | null;
  insightsGeneratedAt: string | null;
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

export function ParentDashboardClient({
  student, kpi, subjects, quizTrend, weakChapters, weakSubjects,
  initialInsights, insightsGeneratedAt,
}: ParentDashboardProps) {
  const router = useRouter();
  const [insights, setInsights] = useState<ParentInsight | null>(initialInsights);
  const [insightsAt, setInsightsAt] = useState<string | null>(insightsGeneratedAt);

  const lastActiveLabel = kpi.days_since_active === null ? 'Never'
    : kpi.days_since_active === 0 ? 'Today'
    : kpi.days_since_active === 1 ? 'Yesterday'
    : `${kpi.days_since_active} days ago`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
              {student.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">{student.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="bg-indigo-50 text-indigo-700 border-0 text-xs">Class {student.grade}</Badge>
                <Badge className="bg-violet-50 text-violet-700 border-0 text-xs">{student.board}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-amber-500" />{kpi.current_streak}-day streak</span>
            <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-indigo-500" />Level {kpi.level} · {kpi.total_xp.toLocaleString()} XP</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gray-400" />Last active: {lastActiveLabel}</span>
          </div>
        </div>
      </div>

      {/* AI parent message banner */}
      {insights?.parent_message && (
        <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3">
          <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
          <p className="text-sm text-violet-800 font-medium">{insights.parent_message}</p>
        </div>
      )}

      {/* Alerts */}
      {insights?.alerts && insights.alerts.length > 0 && (
        <AlertsPanel alerts={insights.alerts} />
      )}

      {/* KPI Grid */}
      <Section title="Performance Overview" icon={<BarChart2 className="h-4 w-4" />}>
        <KPIGrid data={kpi} />
      </Section>

      {/* Exam Readiness */}
      <Section title="Exam Readiness" icon={<Target className="h-4 w-4" />}>
        <ExamReadinessGauge
          readiness_pct={kpi.exam_readiness_pct}
          student_name={student.name}
          weak_subjects={weakSubjects}
        />
      </Section>

      {/* Subject Performance */}
      <Section title="Subject Performance" icon={<BarChart2 className="h-4 w-4" />}>
        <SubjectMasteryChart subjects={subjects} />
      </Section>

      {/* Quiz Trend */}
      <Section title="Quiz Score Trend (Last 60 Days)" icon={<BarChart2 className="h-4 w-4" />}>
        <QuizTrendChart points={quizTrend} />
      </Section>

      {/* Weak Topics */}
      <Section title="Chapters Needing Attention" icon={<AlertTriangle className="h-4 w-4" />}>
        <WeakTopicsPanel chapters={weakChapters} />
      </Section>

      {/* AI SWOT */}
      <Section
        title="AI Learning Report (SWOT)"
        icon={<Sparkles className="h-4 w-4" />}
      >
        {insights ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <InsightRefreshButton
                studentId={student.id}
                onRefreshed={(ins, at) => { setInsights(ins); setInsightsAt(at); }}
              />
            </div>
            <SwotPanel insights={insights} generatedAt={insightsAt!} />
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-gray-500">No AI insights generated yet.</p>
            <InsightRefreshButton
              studentId={student.id}
              onRefreshed={(ins, at) => { setInsights(ins); setInsightsAt(at); }}
            />
          </div>
        )}
      </Section>

      {/* Recommendations */}
      {insights?.recommendations && insights.recommendations.length > 0 && (
        <Section title="AI Recommendations for You" icon={<BookOpen className="h-4 w-4" />}>
          <RecommendationsPanel recommendations={insights.recommendations} />
        </Section>
      )}

      <p className="text-center text-xs text-gray-300 pb-4">
        Powered by EaseStudy AI · Data refreshes on every visit
      </p>
    </div>
  );
}
