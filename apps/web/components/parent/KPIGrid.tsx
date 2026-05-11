'use client';

import { TrendingUp, TrendingDown, Minus, Flame, Trophy, BookOpen, Target, Clock, Zap, BarChart2, Star, Activity } from 'lucide-react';

export interface KPIData {
  overall_quiz_avg: number | null;
  weekly_improvement: number | null;
  consistency_pct: number;
  exam_readiness_pct: number;
  current_streak: number;
  level: number;
  total_xp: number;
  flashcard_retention_pct: number;
  chapters_mastered: number;
  chapters_total: number;
  active_days_last_30: number;
  days_since_active: number | null;
}

type Status = 'excellent' | 'good' | 'moderate' | 'attention';

function getStatus(value: number, thresholds: [number, number, number]): Status {
  const [excellent, good, moderate] = thresholds;
  if (value >= excellent) return 'excellent';
  if (value >= good) return 'good';
  if (value >= moderate) return 'moderate';
  return 'attention';
}

const STATUS_STYLES: Record<Status, string> = {
  excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  good: 'bg-blue-50 text-blue-700 border-blue-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  attention: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_BAR: Record<Status, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-blue-500',
  moderate: 'bg-amber-500',
  attention: 'bg-rose-500',
};

const STATUS_LABELS: Record<Status, string> = {
  excellent: 'Excellent',
  good: 'Good',
  moderate: 'Moderate',
  attention: 'Needs Attention',
};

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  status: Status;
  progress?: number; // 0-100
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  tooltip: string;
}

function KPICard({ icon, label, value, subtext, status, progress, trend, trendLabel, tooltip }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow" title={tooltip}>
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600">
          {icon}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
      {progress !== undefined && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${STATUS_BAR[status]}`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {trend && trendLabel && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-gray-400'
          }`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {trendLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export function KPIGrid({ data }: { data: KPIData }) {
  const improvementTrend = data.weekly_improvement === null ? undefined
    : data.weekly_improvement > 1 ? 'up' : data.weekly_improvement < -1 ? 'down' : 'flat';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <KPICard
        icon={<BarChart2 className="h-5 w-5" />}
        label="Performance Score"
        value={data.overall_quiz_avg !== null ? `${data.overall_quiz_avg}%` : 'N/A'}
        subtext="Avg quiz score"
        status={data.overall_quiz_avg !== null ? getStatus(data.overall_quiz_avg, [85, 70, 50]) : 'attention'}
        progress={data.overall_quiz_avg ?? 0}
        tooltip="Average score across all quizzes taken so far"
      />
      <KPICard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Weekly Improvement"
        value={data.weekly_improvement !== null ? `${data.weekly_improvement > 0 ? '+' : ''}${data.weekly_improvement}%` : 'N/A'}
        subtext="vs last week"
        status={data.weekly_improvement !== null ? getStatus(data.weekly_improvement + 50, [60, 53, 50]) : 'moderate'}
        trend={improvementTrend}
        trendLabel={data.weekly_improvement !== null ? `${Math.abs(data.weekly_improvement)}%` : undefined}
        tooltip="Change in average quiz score compared to the previous week"
      />
      <KPICard
        icon={<Activity className="h-5 w-5" />}
        label="Study Consistency"
        value={`${data.consistency_pct}%`}
        subtext={`${data.active_days_last_30} of 30 days`}
        status={getStatus(data.consistency_pct, [80, 60, 40])}
        progress={data.consistency_pct}
        tooltip="Percentage of days in the last 30 where your child was active on EaseStudy"
      />
      <KPICard
        icon={<Target className="h-5 w-5" />}
        label="Exam Readiness"
        value={`${data.exam_readiness_pct}%`}
        subtext={`${data.chapters_mastered}/${data.chapters_total} chapters`}
        status={getStatus(data.exam_readiness_pct, [80, 65, 45])}
        progress={data.exam_readiness_pct}
        tooltip="Percentage of chapters fully mastered (quiz ≥60% + flashcards completed)"
      />
      <KPICard
        icon={<Flame className="h-5 w-5" />}
        label="Study Streak"
        value={`${data.current_streak}d`}
        subtext="consecutive days"
        status={getStatus(data.current_streak, [14, 7, 3])}
        tooltip="Number of consecutive days your child has studied"
      />
      <KPICard
        icon={<Trophy className="h-5 w-5" />}
        label="XP Level"
        value={`Level ${data.level}`}
        subtext={`${data.total_xp.toLocaleString()} XP earned`}
        status={getStatus(data.level, [8, 5, 3])}
        tooltip="Learning level earned through quizzes and flashcards"
      />
      <KPICard
        icon={<Zap className="h-5 w-5" />}
        label="Flashcard Retention"
        value={`${data.flashcard_retention_pct}%`}
        subtext="cards marked known"
        status={getStatus(data.flashcard_retention_pct, [80, 60, 40])}
        progress={data.flashcard_retention_pct}
        tooltip="Percentage of flashcards your child has marked as 'known'"
      />
      <KPICard
        icon={<BookOpen className="h-5 w-5" />}
        label="Chapters Mastered"
        value={`${data.chapters_mastered}`}
        subtext={`of ${data.chapters_total} total`}
        status={data.chapters_total > 0 ? getStatus(data.exam_readiness_pct, [80, 65, 45]) : 'moderate'}
        progress={data.exam_readiness_pct}
        tooltip="Chapters where both the quiz and flashcards are completed successfully"
      />
      <KPICard
        icon={<Clock className="h-5 w-5" />}
        label="Days Active (30d)"
        value={`${data.active_days_last_30}`}
        subtext="active study days"
        status={getStatus(data.active_days_last_30, [24, 18, 12])}
        progress={Math.round((data.active_days_last_30 / 30) * 100)}
        tooltip="Number of days your child studied in the last 30 days"
      />
      <KPICard
        icon={<Star className="h-5 w-5" />}
        label="Last Active"
        value={data.days_since_active === null ? 'Never' : data.days_since_active === 0 ? 'Today' : `${data.days_since_active}d ago`}
        subtext={data.days_since_active !== null && data.days_since_active > 3 ? 'Remind to study!' : 'Keep it up!'}
        status={data.days_since_active === null ? 'attention' : getStatus(7 - Math.min(7, data.days_since_active), [7, 5, 4])}
        tooltip="When your child last opened EaseStudy"
      />
    </div>
  );
}
