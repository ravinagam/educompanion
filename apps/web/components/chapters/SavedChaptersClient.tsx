'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  BookOpen, Upload, CheckCircle2, AlertCircle, Clock,
  Loader2, FlaskConical, Layers, Trash2, Video, RefreshCw, Plus,
} from 'lucide-react';

interface Chapter {
  id: string;
  name: string;
  upload_status: string;
  complexity_score: number | null;
  created_at: string;
  file_name: string | null;
  file_size_bytes: number | null;
}

interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

interface Props { subjects: Subject[] }

// Colour palette for subject tabs — cycles for each subject
const TAB_PALETTES = [
  { active: 'border-blue-600 text-blue-700 bg-blue-50',   inactive: 'text-gray-500 hover:text-blue-600 hover:bg-blue-50/50',   dot: 'bg-blue-100 text-blue-700' },
  { active: 'border-violet-600 text-violet-700 bg-violet-50', inactive: 'text-gray-500 hover:text-violet-600 hover:bg-violet-50/50', dot: 'bg-violet-100 text-violet-700' },
  { active: 'border-emerald-600 text-emerald-700 bg-emerald-50', inactive: 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/50', dot: 'bg-emerald-100 text-emerald-700' },
  { active: 'border-amber-600 text-amber-700 bg-amber-50',  inactive: 'text-gray-500 hover:text-amber-600 hover:bg-amber-50/50',  dot: 'bg-amber-100 text-amber-700' },
  { active: 'border-rose-600 text-rose-700 bg-rose-50',    inactive: 'text-gray-500 hover:text-rose-600 hover:bg-rose-50/50',    dot: 'bg-rose-100 text-rose-700' },
  { active: 'border-cyan-600 text-cyan-700 bg-cyan-50',    inactive: 'text-gray-500 hover:text-cyan-600 hover:bg-cyan-50/50',    dot: 'bg-cyan-100 text-cyan-700' },
];

// Action button colour styles per action
const ACTION_STYLES = {
  quiz:       { ready: 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300', disabled: 'border-gray-100 text-gray-300 bg-gray-50' },
  flashcards: { ready: 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300', disabled: 'border-gray-100 text-gray-300 bg-gray-50' },
  video:      { ready: 'border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 hover:border-violet-300', disabled: 'border-gray-100 text-gray-300 bg-gray-50' },
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ready':      return <Badge className="bg-green-500 text-white gap-1 text-xs"><CheckCircle2 className="h-3 w-3" />Ready</Badge>;
    case 'processing': return <Badge className="bg-blue-500 text-white gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
    case 'uploading':  return <Badge variant="secondary" className="gap-1 text-xs"><Clock className="h-3 w-3" />Uploading</Badge>;
    default:           return <Badge variant="destructive" className="gap-1 text-xs"><AlertCircle className="h-3 w-3" />Error</Badge>;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function ChapterCard({
  chapter, deleting, retrying, onDelete, onRetry,
}: {
  chapter: Chapter;
  deleting: boolean;
  retrying: boolean;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const ready = chapter.upload_status === 'ready';
  const canRetry = chapter.upload_status === 'error' || chapter.upload_status === 'processing';

  const actions = [
    { key: 'quiz',       href: `/chapters/${chapter.id}/quiz`,       icon: <FlaskConical className="h-4 w-4" />, label: 'Quiz' },
    { key: 'flashcards', href: `/chapters/${chapter.id}/flashcards`, icon: <Layers className="h-4 w-4" />,       label: 'Flashcards' },
    { key: 'video',      href: `/chapters/${chapter.id}/video`,      icon: <Video className="h-4 w-4" />,        label: 'Video Summary' },
  ] as const;

  return (
    <Card className="flex flex-col border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{chapter.name}</p>
            {chapter.file_size_bytes && (
              <p className="text-xs text-gray-400 mt-0.5">{formatBytes(chapter.file_size_bytes)}</p>
            )}
          </div>
          <button
            onClick={onDelete}
            disabled={deleting || retrying}
            className="shrink-0 p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Delete chapter"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={chapter.upload_status} />
          {chapter.complexity_score && ready && (
            <span className="text-xs text-gray-400">Complexity: {chapter.complexity_score}/10</span>
          )}
          {canRetry && (
            <button
              onClick={onRetry}
              disabled={retrying}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-auto grid grid-cols-3 gap-2">
          {actions.map(({ key, href, icon, label }) => {
            const style = ACTION_STYLES[key];
            const cls = `flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-xs font-semibold transition-colors ${
              ready ? style.ready : `${style.disabled} cursor-not-allowed`
            }`;
            return ready ? (
              <Link key={key} href={href} className={cls}>{icon}{label}</Link>
            ) : (
              <div key={key} className={cls}>{icon}{label}</div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function SavedChaptersClient({ subjects }: Props) {
  const router = useRouter();
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});

  const hasSubjects = subjects.length > 0;
  const totalChapters = subjects.reduce((n, s) => n + s.chapters.length, 0);
  const activeSubject = subjects[activeSubjectIdx];
  const activePalette = TAB_PALETTES[activeSubjectIdx % TAB_PALETTES.length];

  async function deleteChapter(chapterId: string) {
    setDeleting(d => ({ ...d, [chapterId]: true }));
    const res = await fetch(`/api/chapters/${chapterId}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to delete chapter');
      setDeleting(d => ({ ...d, [chapterId]: false }));
    } else {
      toast.success('Chapter deleted');
      router.refresh();
    }
  }

  async function retryChapter(chapterId: string) {
    setRetrying(r => ({ ...r, [chapterId]: true }));
    const res = await fetch(`/api/chapters/${chapterId}/reprocess`, { method: 'POST' });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? 'Retry failed');
      setRetrying(r => ({ ...r, [chapterId]: false }));
    } else {
      toast.success('Re-processing started…');
      router.refresh();
      setRetrying(r => ({ ...r, [chapterId]: false }));
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Saved Chapters</h1>
          <p className="text-gray-500 text-sm">
            {totalChapters} chapter{totalChapters !== 1 ? 's' : ''} across {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/upload">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Upload Material
          </Button>
        </Link>
      </div>

      {!hasSubjects ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No chapters saved yet</p>
          <p className="text-sm mb-4">Upload your first chapter to get started</p>
          <Link href="/upload">
            <Button><Upload className="h-4 w-4 mr-2" />Upload Material</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Subject tabs */}
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {subjects.map((s, i) => {
              const p = TAB_PALETTES[i % TAB_PALETTES.length];
              const isActive = i === activeSubjectIdx;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSubjectIdx(i)}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap rounded-t-lg transition-all ${
                    isActive ? p.active : `border-transparent ${p.inactive}`
                  }`}
                >
                  {s.name}
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                    isActive ? p.dot : 'bg-gray-100 text-gray-500'
                  }`}>
                    {s.chapters.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active subject heading strip */}
          {activeSubject && (
            <div className={`rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 ${activePalette.dot}`}>
              <BookOpen className="h-4 w-4 opacity-70" />
              {activeSubject.name} — {activeSubject.chapters.length} chapter{activeSubject.chapters.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Chapter cards */}
          {activeSubject?.chapters.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Upload className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No chapters in {activeSubject.name}</p>
              <Link href="/upload" className="mt-3 inline-block">
                <Button size="sm" variant="outline">Add Chapter</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeSubject?.chapters.map(chapter => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  deleting={!!deleting[chapter.id]}
                  retrying={!!retrying[chapter.id]}
                  onDelete={() => deleteChapter(chapter.id)}
                  onRetry={() => retryChapter(chapter.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
