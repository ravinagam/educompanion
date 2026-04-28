'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface Chapter { id: string; name: string; upload_status: string }
interface Subject { id: string; name: string; chapters: Chapter[] }
interface User {
  id: string; name: string; email: string;
  grade: number; board: string; created_at: string;
  subjects: Subject[];
}
interface Feedback {
  id: string; message: string; page: string | null; created_at: string;
  user: { name: string; email: string } | null;
}

interface Props { users: User[]; feedback: Feedback[] }

function stat(label: string, value: number, icon: React.ReactNode, color: string) {
  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <div className={`px-5 py-4 flex items-center gap-4 ${color}`}>
        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">{icon}</div>
        <div className="text-white">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs opacity-80">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function statusColor(s: string) {
  if (s === 'ready') return 'bg-green-100 text-green-700';
  if (s === 'processing') return 'bg-blue-100 text-blue-700';
  if (s === 'error') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function UserRow({ user }: { user: User }) {
  const [expanded, setExpanded] = useState(false);
  const totalChapters = user.subjects.reduce((n, s) => n + s.chapters.length, 0);
  const readyChapters = user.subjects.reduce((n, s) => n + s.chapters.filter(c => c.upload_status === 'ready').length, 0);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-sm">
          {user.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-indigo-50 text-indigo-700 border-0 text-xs">Class {user.grade}</Badge>
          <Badge className="bg-violet-50 text-violet-700 border-0 text-xs">{user.board}</Badge>
          <span className="text-xs text-gray-400">{totalChapters} ch · {user.subjects.length} subj</span>
          <span className="text-xs text-gray-300">{new Date(user.created_at).toLocaleDateString('en-IN')}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-2">
          {user.subjects.length === 0 ? (
            <p className="text-xs text-gray-400">No subjects yet</p>
          ) : user.subjects.map(subj => (
            <div key={subj.id}>
              <p className="text-xs font-semibold text-gray-600 mb-1">{subj.name} ({subj.chapters.length} chapters · {subj.chapters.filter(c => c.upload_status === 'ready').length} ready)</p>
              <div className="flex flex-wrap gap-1.5">
                {subj.chapters.map(ch => (
                  <span key={ch.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(ch.upload_status)}`}>
                    {ch.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {totalChapters > 0 && (
            <p className="text-xs text-gray-400 pt-1">{readyChapters}/{totalChapters} chapters ready</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminDashboard({ users, feedback }: Props) {
  const [tab, setTab] = useState<'users' | 'feedback'>('users');
  const totalChapters = users.reduce((n, u) => n + u.subjects.reduce((m, s) => m + s.chapters.length, 0), 0);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 px-6 py-5 text-white shadow-md">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-300 text-sm mt-0.5">EduCompanion overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stat('Total Users', users.length, <Users className="h-5 w-5" />, 'bg-gradient-to-br from-indigo-600 to-blue-600')}
        {stat('Total Chapters', totalChapters, <BookOpen className="h-5 w-5" />, 'bg-gradient-to-br from-emerald-600 to-teal-600')}
        {stat('Feedback Received', feedback.length, <MessageSquare className="h-5 w-5" />, 'bg-gradient-to-br from-amber-500 to-orange-500')}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['users', 'feedback'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px capitalize transition-all rounded-t-lg ${
              tab === t
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-transparent text-gray-500 hover:text-indigo-600'
            }`}
          >
            {t === 'users' ? `Users (${users.length})` : `Feedback (${feedback.length})`}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No users yet</p>
          ) : users.map(u => <UserRow key={u.id} user={u} />)}
        </div>
      )}

      {/* Feedback tab */}
      {tab === 'feedback' && (
        <div className="space-y-3">
          {feedback.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No feedback yet</p>
          ) : feedback.map(f => (
            <Card key={f.id} className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                      {f.user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{f.user?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{f.user?.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    {f.page && <p className="text-xs text-gray-300">{f.page}</p>}
                  </div>
                </div>
                <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">{f.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
