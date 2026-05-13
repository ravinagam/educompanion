'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export interface QuizTrendPoint {
  date: string;
  score_pct: number;
  subject: string;
  chapter_name?: string;
  score_raw?: string;
}

export function QuizTrendChart({ points }: { points: QuizTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-gray-400">
        No quiz attempts yet. Encourage your child to take their first quiz!
      </div>
    );
  }

  // Group by date, take average per day
  const byDate = new Map<string, number[]>();
  points.forEach(p => {
    const d = p.date.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(p.score_pct);
  });

  const chartData = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-20)
    .map(([date, scores]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      avg: Math.round(scores.reduce((s, x) => s + x, 0) / scores.length),
    }));

  const avg = Math.round(chartData.reduce((s, d) => s + d.avg, 0) / chartData.length);

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip
            formatter={(val) => [`${val}%`, 'Score']}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          <ReferenceLine y={avg} stroke="#a5b4fc" strokeDasharray="4 4" label={{ value: `Avg ${avg}%`, fill: '#6366f1', fontSize: 11, position: 'insideTopRight' }} />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ fill: '#6366f1', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
