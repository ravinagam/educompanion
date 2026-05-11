'use client';

import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

function classifyAlert(text: string): 'risk' | 'positive' | 'info' {
  const lower = text.toLowerCase();
  if (lower.includes('no ') || lower.includes('inactive') || lower.includes('missing') || lower.includes('low') || lower.includes('warn') || lower.includes('risk') || lower.includes('weak')) return 'risk';
  if (lower.includes('great') || lower.includes('excellent') || lower.includes('improved') || lower.includes('streak') || lower.includes('mastered') || lower.includes('well')) return 'positive';
  return 'info';
}

export function AlertsPanel({ alerts }: { alerts: string[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const type = classifyAlert(alert);
        const styles = {
          risk: { bg: 'bg-rose-50 border-rose-100', icon: <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />, text: 'text-rose-700' },
          positive: { bg: 'bg-emerald-50 border-emerald-100', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />, text: 'text-emerald-700' },
          info: { bg: 'bg-blue-50 border-blue-100', icon: <Info className="h-4 w-4 text-blue-500 shrink-0" />, text: 'text-blue-700' },
        }[type];
        return (
          <div key={i} className={`flex items-start gap-2.5 border rounded-xl px-3 py-2.5 ${styles.bg}`}>
            {styles.icon}
            <p className={`text-xs font-medium ${styles.text}`}>{alert}</p>
          </div>
        );
      })}
    </div>
  );
}
