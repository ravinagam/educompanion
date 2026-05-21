'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Flame, Trophy, Clock, Sparkles, BarChart2, Target,
  BookOpen, AlertTriangle, TrendingUp, TrendingDown, Minus, CheckCircle2, Gift, Star,
  Printer, Loader2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { GIFT_MILESTONES } from '@/lib/gamification/milestones';
import { Badge } from '@/components/ui/badge';
import { type KPIData } from './KPIGrid';
import { SubjectMasteryChart, type SubjectData } from './SubjectMasteryChart';
import { QuizTrendChart, type QuizTrendPoint } from './QuizTrendChart';
import { WeakTopicsPanel, type WeakChapter } from './WeakTopicsPanel';
import { ExamReadinessGauge } from './ExamReadinessGauge';
import { SwotPanel } from './SwotPanel';
import { RecommendationsPanel } from './RecommendationsPanel';
import { AlertsPanel } from './AlertsPanel';
import { InsightRefreshButton } from './InsightRefreshButton';
import type { ParentInsight } from '@/lib/ai/parent-insights';

interface GiftMilestone {
  xp_milestone: number;
  voucher_inr: number;
  gifted_at: string;
  voucher_code: string | null;
  availed_at: string | null;
}

export interface ParentDashboardProps {
  student: { id: string; name: string; grade: number; board: string };
  kpi: KPIData;
  subjects: SubjectData[];
  quizTrend: QuizTrendPoint[];
  weakChapters: WeakChapter[];
  weakSubjects: string[];
  initialInsights: ParentInsight | null;
  insightsGeneratedAt: string | null;
  milestones: GiftMilestone[];
  hindiChapters: { id: string; name: string; subjectName: string }[];
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

function KpiCard({
  label, value, sub, color, icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-black text-gray-900 leading-tight">{value}</div>
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function ActivityLog({ name, points }: { name: string; points: QuizTrendPoint[] }) {
  // Get last 7 days, sort most recent first, then deduplicate by chapter keeping latest attempt
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
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        No study activity this week.
      </div>
    );
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
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>
              {score}%
            </span>
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

export function ParentDashboardClient({
  student, kpi, subjects, quizTrend, weakChapters, weakSubjects,
  initialInsights, insightsGeneratedAt, milestones, hindiChapters,
}: ParentDashboardProps) {
  const router = useRouter();
  const [insights, setInsights] = useState<ParentInsight | null>(initialInsights);
  const [insightsAt, setInsightsAt] = useState<string | null>(insightsGeneratedAt);
  const [generatingWorksheet, setGeneratingWorksheet] = useState<Record<string, boolean>>({});
  const [worksheetMeta, setWorksheetMeta] = useState<Record<string, string>>({});

  function openPrintWindow(html: string) {
    const w = window.open('', '_blank', 'width=820,height=720');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  function printHindiWorksheet(chapterName: string, subjectName: string, questions: { sentence: string; answer: string }[]) {
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const questionsHtml = questions.map((q, i) =>
      `<div class="question"><span class="qnum">${i + 1}.</span> ${q.sentence}</div>`
    ).join('');
    const answersHtml = questions.map((q, i) =>
      `<div class="ans-row"><span class="qnum">${i + 1}.</span> <span class="ans">${q.answer}</span></div>`
    ).join('');

    openPrintWindow(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Hindi Worksheet — ${chapterName}</title>
      <style>
        @page { margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; font-size: 14px; color: #111; padding: 40px 44px 32px; }
        .header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 32px; }
        .header h1 { font-size: 17px; font-weight: bold; }
        .header .meta { font-size: 11px; color: #555; margin-top: 4px; }
        .section-title { font-size: 13px; font-weight: bold; color: #444; margin-bottom: 18px; letter-spacing: 0.04em; text-transform: uppercase; }
        .question { padding-top: 18px; margin-bottom: 4px; line-height: 1.8; page-break-inside: avoid; }
        .qnum { font-weight: bold; margin-right: 6px; }
        .answer-key { page-break-before: always; padding-top: 40px; }
        .ans-row { padding-top: 14px; line-height: 1.6; }
        .ans { color: #166534; font-weight: 600; }
        .key-note { font-size: 11px; color: #888; margin-bottom: 24px; }
      </style></head><body>
      <div class="header">
        <h1>${chapterName} — रिक्त स्थान भरो</h1>
        <div class="meta">${subjectName} &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; ${questions.length} प्रश्न</div>
      </div>
      <div class="section-title">निर्देश: रिक्त स्थानों की पूर्ति कीजिए</div>
      ${questionsHtml}
      <div class="answer-key">
        <div class="header">
          <h1>${chapterName} — उत्तर कुंजी</h1>
          <div class="meta">${subjectName} &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; केवल अभिभावक / शिक्षक के लिए</div>
        </div>
        <p class="key-note">Answer Key — For Parent / Teacher use only. Do not share with students before they attempt the worksheet.</p>
        ${answersHtml}
      </div>
    </body></html>`);
  }

  async function generateAndPrintWorksheet(chapterId: string, chapterName: string, subjectName: string, force = false) {
    setGeneratingWorksheet(g => ({ ...g, [chapterId]: true }));
    try {
      const url = `/api/generate/quiz/${chapterId}/hindi-worksheet${force ? '?force=true' : ''}`;
      const res = await fetch(url, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? 'Generation failed'); return; }
      setWorksheetMeta(m => ({ ...m, [chapterId]: json.generated_at }));
      printHindiWorksheet(chapterName, subjectName, json.questions);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setGeneratingWorksheet(g => ({ ...g, [chapterId]: false }));
    }
  }

  const lastActiveLabel = kpi.days_since_active === null ? 'Never'
    : kpi.days_since_active === 0 ? 'Today'
    : kpi.days_since_active === 1 ? 'Yesterday'
    : `${kpi.days_since_active}d ago`;

  const performanceValue = kpi.overall_quiz_avg !== null ? `${kpi.overall_quiz_avg}%` : '—';
  const improvementValue = kpi.weekly_improvement !== null
    ? `${kpi.weekly_improvement > 0 ? '+' : ''}${kpi.weekly_improvement}%`
    : '—';
  const improvementIconColor = kpi.weekly_improvement === null ? 'text-gray-400'
    : kpi.weekly_improvement > 0 ? 'text-emerald-600'
    : kpi.weekly_improvement < 0 ? 'text-red-500'
    : 'text-gray-400';
  const improvementIcon = kpi.weekly_improvement !== null && kpi.weekly_improvement > 0
    ? <TrendingUp className={`h-4 w-4 ${improvementIconColor}`} />
    : kpi.weekly_improvement !== null && kpi.weekly_improvement < 0
    ? <TrendingDown className={`h-4 w-4 ${improvementIconColor}`} />
    : <Minus className={`h-4 w-4 ${improvementIconColor}`} />;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-900">{student.name}&apos;s Study Dashboard</h1>
            <p className="text-xs text-gray-400">Real-time learning overview</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
          kpi.days_since_active === 0 ? 'bg-emerald-50 text-emerald-700' :
          kpi.days_since_active === 1 ? 'bg-amber-50 text-amber-700' :
          'bg-gray-100 text-gray-500'
        }`}>
          <Clock className="h-3.5 w-3.5" />
          Last active: {lastActiveLabel}
        </div>
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
        {(() => {
          const claimedXp = milestones.map(m => m.xp_milestone);
          const next = GIFT_MILESTONES.find(m => !claimedXp.includes(m.xp) && kpi.total_xp < m.xp);
          if (!next) return null;
          const xpLeft = next.xp - kpi.total_xp;
          const pct = Math.min(100, Math.round((kpi.total_xp / next.xp) * 100));
          return (
            <div className="w-full mt-2 bg-white/10 rounded-xl px-4 py-2.5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-yellow-200">
                  <Star className="h-3.5 w-3.5 text-yellow-300" />
                  Next reward: ₹{next.voucher_inr} Amazon Voucher at {next.xp.toLocaleString()} XP
                </span>
                <span className="text-white/70">{xpLeft.toLocaleString()} XP to go</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-yellow-300 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Voucher status banners */}
      {milestones.map(m => {
        if (m.availed_at) {
          return (
            <div key={m.xp_milestone} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-800 font-medium">
                {student.name} received a <span className="font-bold">₹{m.voucher_inr} Amazon Voucher</span> and has already availed it on{' '}
                {new Date(m.availed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
              </p>
            </div>
          );
        }
        if (m.voucher_code) {
          return (
            <div key={m.xp_milestone} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <Gift className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                {student.name} earned a <span className="font-bold">₹{m.voucher_inr} Amazon Voucher</span> — the code has been shared and is waiting to be availed.
              </p>
            </div>
          );
        }
        return (
          <div key={m.xp_milestone} className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <Gift className="h-4 w-4 text-blue-400 shrink-0" />
            <p className="text-sm text-blue-800 font-medium">
              {student.name} reached a milestone and is eligible for a <span className="font-bold">₹{m.voucher_inr} Amazon Voucher</span> — voucher code will be added soon.
            </p>
          </div>
        );
      })}

      {/* Alerts */}
      {insights?.alerts && insights.alerts.length > 0 && (
        <AlertsPanel alerts={insights.alerts} />
      )}

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
        {/* Activity log */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-800">What {student.name.split(' ')[0]} Studied This Week</h2>
          </div>
          <div className="p-5">
            <ActivityLog name={student.name} points={quizTrend} />
          </div>
        </div>

        {/* AI insights */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-bold text-gray-800">AI Insights for Parents</h2>
            </div>
            <InsightRefreshButton
              studentId={student.id}
              onRefreshed={(ins, at) => { setInsights(ins); setInsightsAt(at); }}
            />
          </div>
          <div className="p-5">
            {insights ? (
              <div className="space-y-3">
                <InsightTagRow tag="Strong" items={insights.strengths} tagColor="bg-emerald-100 text-emerald-700" />
                <InsightTagRow tag="Watch" items={insights.weaknesses} tagColor="bg-amber-100 text-amber-700" />
                <InsightTagRow tag="Tip" items={insights.opportunities} tagColor="bg-blue-100 text-blue-700" />
                {insights.recommendations && insights.recommendations.length > 0 && (
                  <InsightTagRow tag="Action" items={insights.recommendations.slice(0, 2)} tagColor="bg-violet-100 text-violet-700" />
                )}
                {insightsAt && (
                  <p className="text-[10px] text-gray-300 pt-1">
                    Updated {new Date(insightsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-gray-500">Generate AI insights to see personalised tips.</p>
                <InsightRefreshButton
                  studentId={student.id}
                  onRefreshed={(ins, at) => { setInsights(ins); setInsightsAt(at); }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detailed analytical sections below ── */}

      {/* Subject Performance */}
      <Section title="Subject Performance" icon={<BarChart2 className="h-4 w-4" />}>
        <SubjectMasteryChart subjects={subjects} />
      </Section>

      {/* Exam Readiness */}
      <Section title="Exam Readiness" icon={<Target className="h-4 w-4" />}>
        <ExamReadinessGauge
          readiness_pct={kpi.exam_readiness_pct}
          student_name={student.name}
          weak_subjects={weakSubjects}
        />
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
      <Section title="AI Learning Report (SWOT)" icon={<Sparkles className="h-4 w-4" />}>
        {insights ? (
          <SwotPanel insights={insights} generatedAt={insightsAt!} />
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

      {hindiChapters.length > 0 && (
        <Section title="हिंदी वर्कशीट | Hindi Worksheet" icon={<Printer className="h-4 w-4" />}>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Generate a fill-in-the-blank worksheet for any Hindi chapter. Questions and answer key print on separate pages.
            </p>
            {hindiChapters.map(ch => {
              const isGenerating = !!generatingWorksheet[ch.id];
              const generatedAt = worksheetMeta[ch.id];
              const dateLabel = generatedAt
                ? new Date(generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : null;
              return (
                <div key={ch.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ch.name}</p>
                    <p className="text-xs text-gray-400">
                      {ch.subjectName}
                      {dateLabel && <span className="ml-2 text-emerald-600">· Generated {dateLabel}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => generateAndPrintWorksheet(ch.id, ch.name, ch.subjectName)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                    >
                      {isGenerating
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
                        : <><Printer className="h-3.5 w-3.5" />Print Worksheet</>}
                    </button>
                    {dateLabel && (
                      <button
                        type="button"
                        onClick={() => generateAndPrintWorksheet(ch.id, ch.name, ch.subjectName, true)}
                        disabled={isGenerating}
                        title="Regenerate with new questions"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-100 hover:border-gray-300 rounded-lg px-2 py-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="h-3 w-3" /> Regenerate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <p className="text-center text-xs text-gray-300 pb-4">
        Powered by EaseStudy AI · Data refreshes on every visit
      </p>
    </div>
  );
}
