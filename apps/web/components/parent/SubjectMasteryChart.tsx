'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export interface SubjectData {
  name: string;
  chapters_total: number;
  chapters_mastered: number;
  mastery_pct: number;
  avg_quiz_score_pct: number | null;
  flashcards_known: number;
  flashcards_total: number;
}

function barColor(pct: number) {
  if (pct >= 70) return '#10b981';
  if (pct >= 40) return '#f59e0b';
  return '#f43f5e';
}

function statusBadge(pct: number) {
  if (pct >= 70) return { label: 'Strong', cls: 'bg-emerald-100 text-emerald-700' };
  if (pct >= 40) return { label: 'Progressing', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Needs Focus', cls: 'bg-rose-100 text-rose-700' };
}

export function SubjectMasteryChart({ subjects }: { subjects: SubjectData[] }) {
  if (subjects.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">No subjects added yet.</p>;
  }

  const chartData = subjects.map(s => ({
    name: s.name.length > 8 ? s.name.slice(0, 8) + '…' : s.name,
    fullName: s.name,
    mastery: s.mastery_pct,
    quiz: s.avg_quiz_score_pct ?? 0,
  }));

  return (
    <div className="space-y-5">
      {/* Bar chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip
              formatter={(val: number, name: string) => [`${val}%`, name === 'mastery' ? 'Mastery' : 'Quiz Avg']}
              labelFormatter={(label: string) => chartData.find(d => d.name === label)?.fullName ?? label}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
            />
            <Bar dataKey="mastery" radius={[6, 6, 0, 0]} name="mastery">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.mastery)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Subject cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subjects.map(subj => {
          const badge = statusBadge(subj.mastery_pct);
          const flashPct = subj.flashcards_total > 0
            ? Math.round((subj.flashcards_known / subj.flashcards_total) * 100)
            : 0;
          return (
            <div key={subj.name} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-gray-800">{subj.name}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div>
                  <p className="text-sm font-bold text-gray-900">{subj.mastery_pct}%</p>
                  <p className="text-xs text-gray-400">Mastery</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{subj.avg_quiz_score_pct !== null ? `${subj.avg_quiz_score_pct}%` : '—'}</p>
                  <p className="text-xs text-gray-400">Quiz Avg</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{flashPct}%</p>
                  <p className="text-xs text-gray-400">Flashcards</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-white rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all" style={{ width: `${subj.mastery_pct}%` }} />
                </div>
                <p className="text-xs text-gray-400">{subj.chapters_mastered}/{subj.chapters_total} chapters mastered</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
