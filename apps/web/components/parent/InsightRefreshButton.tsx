'use client';

import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ParentInsight } from '@/lib/ai/parent-insights';

interface Props {
  studentId: string;
  onRefreshed: (insights: ParentInsight, generatedAt: string) => void;
}

export function InsightRefreshButton({ studentId, onRefreshed }: Props) {
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/insights/${studentId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.insights) {
        onRefreshed(data.insights, data.generated_at);
      }
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
      {loading ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {loading ? 'Generating…' : 'Refresh AI Insights'}
    </Button>
  );
}
