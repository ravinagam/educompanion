'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, BookOpen, ChevronDown, ChevronUp, LogOut, Zap, Send, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Chapter { id: string; name: string; upload_status: string }
interface Subject { id: string; name: string; chapters: Chapter[] }
interface User {
  id: string; name: string; email: string;
  grade: number; board: string; created_at: string;
  contact_email: string | null; phone_number: string | null;
  subjects: Subject[];
}
interface Feedback {
  id: string; message: string; page: string | null; created_at: string;
  admin_response: string | null; admin_responded_at: string | null; status: string;
  user: { name: string; email: string } | null;
}

interface UsageLog {
  user_id: string; feature: string;
  input_tokens: number; output_tokens: number; cost_usd: number; created_at: string;
}

interface UserUsage {
  userId: string; name: string; email: string;
  totalCalls: number; totalTokens: number; totalCost: number;
  byFeature: Record<string, { calls: number; tokens: number; cost: number }>;
  lastUsed: string | null;
}

interface Props { users: User[]; feedback: Feedback[]; usageLogs: UsageLog[] }

const FEATURE_LABELS: Record<string, string> = {
  quiz: 'Quiz', quiz_targeted: 'Practice', flashcards: 'Flashcards',
  video_script: 'Video Script', chat: 'AI Chat', summary: 'Summary',
};

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

function FeedbackCard({ f }: { f: Feedback }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState(f.admin_response);
  const [status, setStatus] = useState(f.status ?? 'open');

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/feedback/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_response: replyText }),
      });
      if (res.ok) {
        setResponse(replyText);
        setStatus('resolved');
        setReplyText('');
        setReplyOpen(false);
        toast.success('Reply sent');
      } else {
        toast.error('Failed to send reply');
      }
    } catch {
      toast.error('Network error');
    }
    setSending(false);
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
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
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={status === 'resolved' ? 'bg-green-100 text-green-700 border-0 text-xs' : 'bg-amber-100 text-amber-700 border-0 text-xs'}>
              {status === 'resolved' ? 'Resolved' : 'Open'}
            </Badge>
            <div className="text-right">
              <p className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              {f.page && <p className="text-xs text-gray-300">{f.page}</p>}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">{f.message}</p>

        {response ? (
          <div className="flex gap-2 ml-2">
            <div className="w-0.5 bg-green-200 rounded shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-green-600">Your reply</p>
              <p className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{response}</p>
            </div>
          </div>
        ) : replyOpen ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply to the student…"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={sendReply} disabled={sending || !replyText.trim()} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 gap-1">
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {sending ? 'Sending…' : 'Send Reply'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setReplyOpen(false); setReplyText(''); }} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setReplyOpen(true)} className="h-7 text-xs gap-1">
            <Send className="h-3 w-3" /> Reply
          </Button>
        )}
      </CardContent>
    </Card>
  );
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
          {/* Contact details */}
          <div className="flex gap-4 text-xs text-gray-500 pb-1 border-b border-gray-200">
            <span>📧 {user.contact_email || <span className="italic text-gray-300">no email</span>}</span>
            <span>📱 {user.phone_number || <span className="italic text-gray-300">no phone</span>}</span>
          </div>
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

export function AdminDashboard({ users, feedback, usageLogs }: Props) {
  const [tab, setTab] = useState<'users' | 'feedback' | 'usage'>('users');
  const router = useRouter();
  const totalChapters = users.reduce((n, u) => n + u.subjects.reduce((m, s) => m + s.chapters.length, 0), 0);

  // Aggregate usage per user
  const userMap = new Map(users.map(u => [u.id, u]));
  const usageByUser = new Map<string, UserUsage>();
  for (const log of usageLogs) {
    if (!usageByUser.has(log.user_id)) {
      const u = userMap.get(log.user_id);
      usageByUser.set(log.user_id, { userId: log.user_id, name: u?.name ?? 'Unknown', email: u?.email ?? '', totalCalls: 0, totalTokens: 0, totalCost: 0, byFeature: {}, lastUsed: null });
    }
    const entry = usageByUser.get(log.user_id)!;
    entry.totalCalls++;
    entry.totalTokens += log.input_tokens + log.output_tokens;
    entry.totalCost += Number(log.cost_usd);
    if (!entry.byFeature[log.feature]) entry.byFeature[log.feature] = { calls: 0, tokens: 0, cost: 0 };
    entry.byFeature[log.feature].calls++;
    entry.byFeature[log.feature].tokens += log.input_tokens + log.output_tokens;
    entry.byFeature[log.feature].cost += Number(log.cost_usd);
    if (!entry.lastUsed || log.created_at > entry.lastUsed) entry.lastUsed = log.created_at;
  }
  const userUsageList = [...usageByUser.values()].sort((a, b) => b.totalCost - a.totalCost);
  const totalCost = userUsageList.reduce((s, u) => s + u.totalCost, 0);

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/admin/login');
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 px-6 py-5 text-white shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-300 text-sm mt-0.5">EasyMyStudy overview</p>
        </div>
        <Button onClick={signOut} variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/10 gap-1.5">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stat('Total Users', users.length, <Users className="h-5 w-5" />, 'bg-gradient-to-br from-indigo-600 to-blue-600')}
        {stat('Total Chapters', totalChapters, <BookOpen className="h-5 w-5" />, 'bg-gradient-to-br from-emerald-600 to-teal-600')}
        {stat('Feedback Received', feedback.length, <MessageSquare className="h-5 w-5" />, 'bg-gradient-to-br from-amber-500 to-orange-500')}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-4 bg-gradient-to-br from-violet-600 to-purple-700">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0"><Zap className="h-5 w-5" /></div>
            <div className="text-white">
              <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
              <p className="text-xs opacity-80">AI Cost (USD)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['users', 'feedback', 'usage'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px capitalize transition-all rounded-t-lg ${
              tab === t
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-transparent text-gray-500 hover:text-indigo-600'
            }`}
          >
            {t === 'users' ? `Users (${users.length})` : t === 'feedback' ? `Feedback (${feedback.length})` : `AI Usage (${usageLogs.length})`}
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

      {/* Usage tab */}
      {tab === 'usage' && (
        <div className="space-y-3">
          {userUsageList.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No AI usage recorded yet</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 font-semibold">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3 text-right">Calls</th>
                    <th className="px-4 py-3 text-right">Tokens</th>
                    <th className="px-4 py-3 text-right">Cost (USD)</th>
                    <th className="px-4 py-3">Feature breakdown</th>
                    <th className="px-4 py-3 text-right">Last used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userUsageList.map(u => (
                    <tr key={u.userId} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{u.totalCalls}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{u.totalTokens.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-violet-700">${u.totalCost.toFixed(4)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(u.byFeature).map(([feat, val]) => (
                            <span key={feat} className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">
                              {FEATURE_LABELS[feat] ?? feat} ×{val.calls}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">
                        {u.lastUsed ? new Date(u.lastUsed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Feedback tab */}
      {tab === 'feedback' && (
        <div className="space-y-3">
          {feedback.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No feedback yet</p>
          ) : [...feedback].sort((a, b) => {
            // Open first, then by date descending
            if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }).map(f => <FeedbackCard key={f.id} f={f} />)}
        </div>
      )}
    </div>
  );
}
