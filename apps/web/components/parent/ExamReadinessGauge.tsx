'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Props {
  readiness_pct: number;
  student_name: string;
  weak_subjects: string[];
  studentView?: boolean;
}

function gaugeColor(pct: number) {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#6366f1';
  if (pct >= 40) return '#f59e0b';
  return '#f43f5e';
}

function gaugeLabel(pct: number) {
  if (pct >= 80) return { text: 'Exam Ready', sub: 'Great preparation!' };
  if (pct >= 60) return { text: 'Almost Ready', sub: 'A few more chapters to go.' };
  if (pct >= 40) return { text: 'In Progress', sub: 'Keep revising regularly.' };
  return { text: 'Needs Attention', sub: 'Focus on completing chapters.' };
}

export function ExamReadinessGauge({ readiness_pct, student_name, weak_subjects, studentView = false }: Props) {
  const color = gaugeColor(readiness_pct);
  const label = gaugeLabel(readiness_pct);
  const data = [
    { value: readiness_pct },
    { value: 100 - readiness_pct },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Gauge */}
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={225}
              endAngle={-45}
              innerRadius={42}
              outerRadius={58}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#f3f4f6" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{readiness_pct}%</span>
          <span className="text-xs text-gray-400 font-medium">Ready</span>
        </div>
      </div>

      {/* Label + details */}
      <div className="space-y-3 flex-1">
        <div>
          <p className="text-lg font-bold text-gray-900">{label.text}</p>
          <p className="text-sm text-gray-500">
            {studentView ? 'You are ' : `${student_name} is `}
            <span className="font-semibold" style={{ color }}>{readiness_pct}%</span>
            {` exam-ready. ${label.sub}`}
          </p>
        </div>

        {weak_subjects.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Focus subjects:</p>
            <div className="flex flex-wrap gap-2">
              {weak_subjects.map(s => (
                <span key={s} className="text-xs bg-rose-50 text-rose-700 border border-rose-100 rounded-lg px-2.5 py-1 font-medium">
                  ⚠ {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
