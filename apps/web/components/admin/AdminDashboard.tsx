'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, BookOpen, ChevronDown, ChevronUp, LogOut, Zap, Send, Loader2, Trash2, Share2, Copy, Check, ArrowRight, Gift, CheckCircle2, Bell } from 'lucide-react';
import { GIFT_MILESTONES } from '@/lib/gamification/milestones';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Chapter { id: string; name: string; upload_status: string }
interface Subject { id: string; name: string; chapters: Chapter[] }
interface User {
  id: string; name: string; email: string;
  grade: number; board: string; created_at: string;
  contact_email: string | null; phone_number: string | null;
  referral_code: string | null; referred_by: string | null;
  subjects: Subject[];
}
interface Feedback {
  id: string; message: string; page: string | null; created_at: string;
  admin_response: string | null; admin_responded_at: string | null; status: string;
  rating: number | null; category: string | null;
  user: { name: string; email: string } | null;
}
interface UsageLog {
  user_id: string; feature: string; model?: string;
  input_tokens: number; output_tokens: number; cost_usd: number; created_at: string;
}
interface UserUsage {
  userId: string; name: string; email: string;
  totalCalls: number; totalTokens: number; totalCost: number;
  byFeature: Record<string, { calls: number; tokens: number; cost: number }>;
  byCat: { anthropic: number; voyage: number; sarvam: number };
  lastUsed: string | null;
}
interface Referral {
  id: string; referrer_id: string; referred_id: string;
  rewarded_at: string | null; created_at: string;
}
interface ReferralClick {
  referral_code: string; clicked_at: string;
}
interface UserReferralInfo {
  code: string | null;
  referredByName: string | null;
  referredCount: number;
}
interface UserGamification {
  user_id: string; total_xp: number; level: number;
}
interface GiftMilestoneRow {
  user_id: string; xp_milestone: number; voucher_inr: number;
  gifted_at: string; voucher_code: string | null;
  voucher_sent_at: string | null; availed_at: string | null;
}

interface Props {
  users: User[]; feedback: Feedback[]; usageLogs: UsageLog[];
  referrals: Referral[]; referralClicks: ReferralClick[];
  gamification: UserGamification[]; milestones: GiftMilestoneRow[];
}

const USD_TO_INR = 94;
function inr(usd: number) { return `₹${(usd * USD_TO_INR).toFixed(2)}`; }

const FEATURE_LABELS: Record<string, string> = {
  quiz: 'Quiz', quiz_targeted: 'Practice', flashcards: 'Flashcards',
  video_script: 'Video Script', chat: 'AI Chat', summary: 'Summary',
  embeddings: 'Embeddings', tts: 'Hindi TTS',
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

const PAGE_LABELS: Record<string, string> = {
  quiz: 'Quiz', flashcards: 'Flashcards', video: 'Video',
  summary: 'Summary', chat: 'Ask AI', 'visual-summary': 'Visual Summary',
};

function formatPage(page: string, chapterMap: Map<string, { name: string; subject: string }>): string {
  const m = page.match(/^\/chapters\/([0-9a-f-]{36})(?:\/([^/]+))?/i);
  if (m) {
    const entry = chapterMap.get(m[1]);
    const subject = entry?.subject ?? '';
    const chapter = entry?.name ?? 'Unknown chapter';
    const section = m[2] ? ` › ${PAGE_LABELS[m[2]] ?? m[2]}` : '';
    return subject ? `${subject} · ${chapter}${section}` : `${chapter}${section}`;
  }
  return page.replace(/^\//, '');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 text-gray-400 hover:text-indigo-600 transition-colors align-middle"
      title="Copy"
    >
      {copied ? <Check className="inline h-3 w-3 text-emerald-500" /> : <Copy className="inline h-3 w-3" />}
    </button>
  );
}

function FeedbackCard({ f, chapterMap }: { f: Feedback; chapterMap: Map<string, { name: string; subject: string }> }) {
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
              {f.page && <p className="text-xs text-gray-300">{formatPage(f.page, chapterMap)}</p>}
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 space-y-1">
          {(f.rating !== null || f.category) && (
            <div className="flex items-center gap-2 text-xs mb-1">
              {f.rating !== null && (
                <span className="font-semibold text-amber-700">
                  {'😕😐🙂😊🤩'.split('').filter((_, i) => i % 2 === 0)[f.rating - 1]} {f.rating}/5
                </span>
              )}
              {f.category && (
                <span className="bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full capitalize">{f.category}</span>
              )}
            </div>
          )}
          <p className="text-sm text-gray-700 leading-relaxed">{f.message}</p>
        </div>

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

function ChapterBadge({ chapter, onDeleted }: { chapter: Chapter; onDeleted: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/chapters/${chapter.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleted(chapter.id);
        toast.success(`"${chapter.name}" deleted`);
      } else {
        toast.error('Failed to delete chapter');
      }
    } catch {
      toast.error('Network error');
    }
    setDeleting(false);
    setConfirming(false);
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(chapter.upload_status)}`}>
      {chapter.name}
      {confirming ? (
        <>
          <button onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-800 font-bold ml-1">
            {deleting ? '…' : '✓'}
          </button>
          <button onClick={() => setConfirming(false)} className="text-gray-400 hover:text-gray-600">✕</button>
        </>
      ) : (
        <button onClick={() => setConfirming(true)} className="opacity-40 hover:opacity-100 transition-opacity ml-0.5">
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

function UserRow({ user, referralInfo }: { user: User; referralInfo: UserReferralInfo }) {
  const [expanded, setExpanded] = useState(false);
  const [subjects, setSubjects] = useState(user.subjects);

  function handleChapterDeleted(subjectId: string, chapterId: string) {
    setSubjects(prev => prev.map(s =>
      s.id === subjectId ? { ...s, chapters: s.chapters.filter(c => c.id !== chapterId) } : s
    ));
  }

  const totalChapters = subjects.reduce((n, s) => n + s.chapters.length, 0);
  const readyChapters = subjects.reduce((n, s) => n + s.chapters.filter(c => c.upload_status === 'ready').length, 0);

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
          <p className="text-xs text-gray-400 truncate">{user.contact_email || user.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-indigo-50 text-indigo-700 border-0 text-xs">Class {user.grade}</Badge>
          <Badge className="bg-violet-50 text-violet-700 border-0 text-xs">{user.board}</Badge>
          <span className="text-xs text-gray-400">{totalChapters} ch · {subjects.length} subj</span>
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
          {/* Referral details */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 pb-1 border-b border-gray-200">
            <span>
              🔗 Code:{' '}
              {referralInfo.code
                ? <><span className="font-mono font-semibold text-gray-700">{referralInfo.code}</span><CopyButton text={referralInfo.code} /></>
                : <span className="italic text-gray-300">none</span>}
            </span>
            <span>
              👤 {referralInfo.referredByName
                ? <>Referred by <span className="font-semibold text-gray-700">{referralInfo.referredByName}</span></>
                : 'Organic signup'}
            </span>
            <span>🎁 {referralInfo.referredCount} referral{referralInfo.referredCount !== 1 ? 's' : ''} sent</span>
          </div>
          {subjects.length === 0 ? (
            <p className="text-xs text-gray-400">No subjects yet</p>
          ) : subjects.map(subj => (
            <div key={subj.id}>
              <p className="text-xs font-semibold text-gray-600 mb-1">{subj.name} ({subj.chapters.length} chapters · {subj.chapters.filter(c => c.upload_status === 'ready').length} ready)</p>
              <div className="flex flex-wrap gap-1.5">
                {subj.chapters.map(ch => (
                  <ChapterBadge key={ch.id} chapter={ch} onDeleted={(id) => handleChapterDeleted(subj.id, id)} />
                ))}
              </div>
            </div>
          ))}
          {totalChapters > 0 && (
            <p className="text-xs text-gray-400 pt-1">{readyChapters}/{totalChapters} chapters ready · <span className="italic">click 🗑 to delete a chapter</span></p>
          )}
        </div>
      )}
    </div>
  );
}

function VoucherInput({ row, userName }: { row: GiftMilestoneRow; userName: string }) {
  const [code, setCode] = useState(row.voucher_code ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!row.voucher_code);

  async function save() {
    if (!code.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: row.user_id, xp_milestone: row.xp_milestone, voucher_code: code }),
      });
      if (res.ok) { setSaved(true); toast.success(`Voucher saved for ${userName}`); }
      else { const d = await res.json(); toast.error(d.error ?? 'Failed'); }
    } catch { toast.error('Network error'); }
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        type="text"
        value={code}
        onChange={e => { setCode(e.target.value); setSaved(false); }}
        placeholder="Enter Amazon voucher code"
        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-0"
      />
      <Button
        size="sm"
        onClick={save}
        disabled={saving || !code.trim() || saved}
        className={`h-8 text-xs gap-1.5 shrink-0 ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3" /> : <Send className="h-3 w-3" />}
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
      </Button>
    </div>
  );
}

function RewardsTab({ users, gamification, milestones }: {
  users: User[];
  gamification: UserGamification[];
  milestones: GiftMilestoneRow[];
}) {
  const userMap = new Map(users.map(u => [u.id, u]));
  const xpMap = new Map(gamification.map(g => [g.user_id, g]));

  // Group milestones by user
  const byUser = new Map<string, GiftMilestoneRow[]>();
  for (const m of milestones) {
    if (!byUser.has(m.user_id)) byUser.set(m.user_id, []);
    byUser.get(m.user_id)!.push(m);
  }

  // Sort: users with pending (no voucher_code) milestones first
  const userIds = [...byUser.keys()].sort((a, b) => {
    const aPending = byUser.get(a)!.some(m => !m.voucher_code) ? 0 : 1;
    const bPending = byUser.get(b)!.some(m => !m.voucher_code) ? 0 : 1;
    return aPending - bPending;
  });

  // Students approaching next milestone (not yet reached)
  const nearMilestone = gamification
    .map(g => {
      const claimed = milestones.filter(m => m.user_id === g.user_id).map(m => m.xp_milestone);
      const next = GIFT_MILESTONES.find(m => !claimed.includes(m.xp) && g.total_xp < m.xp) ?? null;
      if (!next) return null;
      const pct = Math.round((g.total_xp / next.xp) * 100);
      const xpLeft = next.xp - g.total_xp;
      return { user: userMap.get(g.user_id), total_xp: g.total_xp, next, pct, xpLeft };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.pct >= 70)
    .sort((a, b) => a.xpLeft - b.xpLeft);

  const pendingCount = [...byUser.values()].flat().filter(m => !m.voucher_code).length;
  const availedCount = [...byUser.values()].flat().filter(m => m.availed_at).length;

  if (milestones.length === 0 && nearMilestone.length === 0) {
    return <p className="text-center text-gray-400 py-10">No milestone activity yet</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-2xl font-black text-amber-600">{milestones.length}</p>
          <p className="text-xs text-gray-500">Total milestones reached</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-2xl font-black text-red-500">{pendingCount}</p>
          <p className="text-xs text-gray-500">Awaiting voucher code</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-2xl font-black text-emerald-600">{availedCount}</p>
          <p className="text-xs text-gray-500">Vouchers availed by students</p>
        </div>
      </div>

      <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            Approaching Next Milestone ({nearMilestone.length} student{nearMilestone.length !== 1 ? 's' : ''})
            <span className="text-xs text-gray-400 font-normal">— students at 70%+ of their next reward</span>
          </h2>
          <div className="overflow-x-auto rounded-xl border border-amber-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 text-left text-xs text-gray-500 font-semibold">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Next Reward</th>
                  <th className="px-4 py-2.5">Progress</th>
                  <th className="px-4 py-2.5 text-right">XP Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {nearMilestone.map(({ user, total_xp, next, pct, xpLeft }) => (
                  <tr key={user?.id ?? total_xp} className="bg-white hover:bg-amber-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                          {user?.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user?.name ?? 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{total_xp.toLocaleString()} XP</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        ₹{next.voucher_inr} Amazon Voucher
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{next.xp.toLocaleString()} XP milestone</p>
                    </td>
                    <td className="px-4 py-2.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-yellow-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${pct >= 90 ? 'text-red-600' : 'text-amber-600'}`}>{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-sm font-bold ${pct >= 90 ? 'text-red-600' : 'text-amber-600'}`}>
                        {xpLeft.toLocaleString()} XP
                      </span>
                    </td>
                  </tr>
                ))}
                {nearMilestone.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                      No students are at 70%+ of a milestone yet — check back as they earn more XP.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      <div className="space-y-3">
        {userIds.map(uid => {
          const user = userMap.get(uid);
          const xp = xpMap.get(uid);
          const rows = byUser.get(uid)!.sort((a, b) => a.xp_milestone - b.xp_milestone);
          const hasPending = rows.some(r => !r.voucher_code);
          return (
            <div key={uid} className={`rounded-xl border overflow-hidden ${hasPending ? 'border-amber-200' : 'border-gray-100'}`}>
              <div className={`flex items-center gap-3 px-4 py-3 ${hasPending ? 'bg-amber-50' : 'bg-white'}`}>
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 font-bold text-sm">
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{user?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{user?.contact_email || user?.email || uid}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500">
                  {xp && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">{xp.total_xp.toLocaleString()} XP · Lvl {xp.level}</span>}
                  {hasPending && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Action needed</span>}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {rows.map(row => (
                  <div key={row.xp_milestone} className="px-4 py-3 bg-white space-y-1">
                    <div className="flex items-center gap-2">
                      {row.availed_at
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : row.voucher_code
                        ? <Gift className="h-4 w-4 text-indigo-500 shrink-0" />
                        : <Gift className="h-4 w-4 text-amber-500 shrink-0" />
                      }
                      <span className="text-sm font-semibold text-gray-800">
                        ₹{row.voucher_inr} Amazon Voucher ({row.xp_milestone.toLocaleString()} XP)
                      </span>
                      <span className="ml-auto text-xs text-gray-400">
                        Reached {new Date(row.gifted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {row.availed_at ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500 ml-6">
                        <span className="font-mono bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-gray-700">{row.voucher_code}</span>
                        <span className="text-emerald-600 font-medium">
                          Availed on {new Date(row.availed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    ) : (
                      <div className="ml-6">
                        {row.voucher_code && (
                          <p className="text-xs text-indigo-600 mb-1">
                            Voucher set · waiting for student to mark as used
                          </p>
                        )}
                        <VoucherInput row={row} userName={user?.name ?? 'Student'} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminDashboard({ users, feedback, usageLogs, referrals, referralClicks, gamification, milestones }: Props) {
  const [tab, setTab] = useState<'users' | 'feedback' | 'usage' | 'referrals' | 'rewards'>('users');
  const router = useRouter();
  const totalChapters = users.reduce((n, u) => n + u.subjects.reduce((m, s) => m + s.chapters.length, 0), 0);
  const chapterMap = new Map<string, { name: string; subject: string }>(
    users.flatMap(u => u.subjects.flatMap(s => s.chapters.map(c => [c.id, { name: c.name, subject: s.name }])))
  );

  function aiCategory(model: string, feature: string): 'anthropic' | 'voyage' | 'sarvam' {
    if (model.includes('voyage')) return 'voyage';
    if (model.includes('bulbul') || feature === 'tts') return 'sarvam';
    return 'anthropic';
  }

  // Aggregate usage per user
  const userMap = new Map(users.map(u => [u.id, u]));
  const usageByUser = new Map<string, UserUsage>();
  for (const log of usageLogs) {
    if (!usageByUser.has(log.user_id)) {
      const u = userMap.get(log.user_id);
      usageByUser.set(log.user_id, {
        userId: log.user_id, name: u?.name ?? 'Unknown', email: u?.email ?? '',
        totalCalls: 0, totalTokens: 0, totalCost: 0,
        byFeature: {}, byCat: { anthropic: 0, voyage: 0, sarvam: 0 }, lastUsed: null,
      });
    }
    const entry = usageByUser.get(log.user_id)!;
    const cost = Number(log.cost_usd);
    entry.totalCalls++;
    entry.totalTokens += log.input_tokens + log.output_tokens;
    entry.totalCost += cost;
    entry.byCat[aiCategory(log.model ?? '', log.feature)] += cost;
    if (!entry.byFeature[log.feature]) entry.byFeature[log.feature] = { calls: 0, tokens: 0, cost: 0 };
    entry.byFeature[log.feature].calls++;
    entry.byFeature[log.feature].tokens += log.input_tokens + log.output_tokens;
    entry.byFeature[log.feature].cost += cost;
    if (!entry.lastUsed || log.created_at > entry.lastUsed) entry.lastUsed = log.created_at;
  }
  const userUsageList = [...usageByUser.values()].sort((a, b) => b.totalCost - a.totalCost);
  const totalCost = userUsageList.reduce((s, u) => s + u.totalCost, 0);
  const totalByCat = {
    anthropic: userUsageList.reduce((s, u) => s + u.byCat.anthropic, 0),
    voyage: userUsageList.reduce((s, u) => s + u.byCat.voyage, 0),
    sarvam: userUsageList.reduce((s, u) => s + u.byCat.sarvam, 0),
  };

  // Referral stats
  const referralCountByUser = new Map<string, number>();
  const referralLastByUser = new Map<string, string>();
  for (const r of referrals) {
    referralCountByUser.set(r.referrer_id, (referralCountByUser.get(r.referrer_id) ?? 0) + 1);
    const last = referralLastByUser.get(r.referrer_id);
    if (!last || r.created_at > last) referralLastByUser.set(r.referrer_id, r.created_at);
  }
  const topReferrers = [...referralCountByUser.entries()]
    .map(([uid, count]) => ({ user: userMap.get(uid), count, lastAt: referralLastByUser.get(uid)! }))
    .filter(r => r.user)
    .sort((a, b) => b.count - a.count);
  const usersViaReferral = users.filter(u => u.referred_by).length;
  const totalXpFromReferrals = referrals.filter(r => r.rewarded_at).length * 400;
  const avgPerReferrer = referralCountByUser.size > 0
    ? (referrals.length / referralCountByUser.size).toFixed(1) : '0';

  // Click stats — keyed by referral_code
  const clicksByCode = new Map<string, number>();
  for (const c of referralClicks) {
    clicksByCode.set(c.referral_code, (clicksByCode.get(c.referral_code) ?? 0) + 1);
  }
  const totalClicks = referralClicks.length;
  const overallConversion = totalClicks > 0
    ? Math.round(usersViaReferral / totalClicks * 100) : 0;

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
          <p className="text-gray-300 text-sm mt-0.5">EaseStudy overview</p>
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
              <p className="text-2xl font-bold">{inr(totalCost)}</p>
              <p className="text-xs opacity-80">AI Cost (INR)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {(['users', 'feedback', 'usage', 'referrals', 'rewards'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px capitalize transition-all rounded-t-lg ${
              tab === t
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-transparent text-gray-500 hover:text-indigo-600'
            }`}
          >
            {t === 'users' ? `Users (${users.length})`
              : t === 'feedback' ? `Feedback (${feedback.length})`
              : t === 'usage' ? `AI Usage (${usageLogs.length})`
              : t === 'referrals' ? `Referrals (${referrals.length})`
              : `Rewards (${milestones.length})`}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No users yet</p>
          ) : users.map(u => (
            <UserRow
              key={u.id}
              user={u}
              referralInfo={{
                code: u.referral_code,
                referredByName: u.referred_by ? (userMap.get(u.referred_by)?.name ?? 'Unknown') : null,
                referredCount: referralCountByUser.get(u.id) ?? 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Usage tab */}
      {tab === 'usage' && (
        <div className="space-y-4">
          {userUsageList.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No AI usage recorded yet</p>
          ) : (
            <>
              {/* Category summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Total AI Spend</p>
                  <p className="text-2xl font-black text-violet-700">{inr(totalCost)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{userUsageList.length} students · {usageLogs.length} calls</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <p className="text-xs font-semibold text-gray-500">Anthropic (Claude)</p>
                  </div>
                  <p className="text-2xl font-black text-indigo-700">{inr(totalByCat.anthropic)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {totalCost > 0 ? Math.round(totalByCat.anthropic / totalCost * 100) : 0}% of total · Quiz, Chat, Flashcards…
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-xs font-semibold text-gray-500">Voyage AI (Embeddings)</p>
                  </div>
                  <p className="text-2xl font-black text-emerald-700">{inr(totalByCat.voyage)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {totalCost > 0 ? Math.round(totalByCat.voyage / totalCost * 100) : 0}% of total · Semantic search
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <p className="text-xs font-semibold text-gray-500">Sarvam AI (TTS)</p>
                  </div>
                  <p className="text-2xl font-black text-amber-700">{inr(totalByCat.sarvam)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {totalCost > 0 ? Math.round(totalByCat.sarvam / totalCost * 100) : 0}% of total · Read-aloud audio
                  </p>
                </div>
              </div>

              {/* Per-student breakdown table */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 font-semibold">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" /> Anthropic</span>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Voyage</span>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Sarvam</span>
                      </th>
                      <th className="px-4 py-3 text-right font-bold text-gray-700">Total</th>
                      <th className="px-4 py-3">Features used</th>
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
                        <td className="px-4 py-3 text-right font-mono text-indigo-700">
                          {u.byCat.anthropic > 0 ? inr(u.byCat.anthropic) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">
                          {u.byCat.voyage > 0 ? inr(u.byCat.voyage) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-700">
                          {u.byCat.sarvam > 0 ? inr(u.byCat.sarvam) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-violet-700">{inr(u.totalCost)}</td>
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
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold text-sm">
                      <td className="px-4 py-3 text-gray-600">Total</td>
                      <td className="px-4 py-3 text-right font-mono text-indigo-700">{inr(totalByCat.anthropic)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">{inr(totalByCat.voyage)}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-700">{inr(totalByCat.sarvam)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-violet-700">{inr(totalCost)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Referrals tab */}
      {tab === 'referrals' && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white">
                <p className="text-2xl font-bold">{totalClicks}</p>
                <p className="text-xs opacity-80">Link Clicks</p>
              </div>
            </Card>
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
                <p className="text-2xl font-bold">{usersViaReferral}</p>
                <p className="text-xs opacity-80">
                  Signups via Referral ({overallConversion}% conversion)
                </p>
              </div>
            </Card>
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <p className="text-2xl font-bold">{totalXpFromReferrals.toLocaleString()}</p>
                <p className="text-xs opacity-80">XP Awarded via Referrals</p>
              </div>
            </Card>
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
                <p className="text-2xl font-bold">{avgPerReferrer}</p>
                <p className="text-xs opacity-80">Avg Signups / Referrer</p>
              </div>
            </Card>
          </div>

          {/* Top Referrers */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-violet-500" /> Top Referrers
            </h2>
            {topReferrers.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No referrals yet</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 font-semibold">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Referrer</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3 text-right">Clicks</th>
                      <th className="px-4 py-3 text-right">Signups</th>
                      <th className="px-4 py-3 text-right">Conv %</th>
                      <th className="px-4 py-3 text-right">XP Earned</th>
                      <th className="px-4 py-3 text-right">Last Signup</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topReferrers.map((r, i) => {
                      const clicks = r.user!.referral_code ? (clicksByCode.get(r.user!.referral_code) ?? 0) : 0;
                      const conv = clicks > 0 ? Math.round(r.count / clicks * 100) : 0;
                      return (
                        <tr key={r.user!.id} className="bg-white hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                                {r.user!.name[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{r.user!.name}</p>
                                <p className="text-xs text-gray-400">{r.user!.contact_email || r.user!.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                              {r.user!.referral_code ?? '—'}
                            </span>
                            {r.user!.referral_code && <CopyButton text={r.user!.referral_code} />}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">{clicks}</td>
                          <td className="px-4 py-3 text-right font-bold text-violet-700">{r.count}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                              conv >= 50 ? 'bg-emerald-100 text-emerald-700'
                                : conv >= 20 ? 'bg-amber-100 text-amber-700'
                                : clicks === 0 ? 'text-gray-300'
                                : 'bg-red-50 text-red-500'
                            }`}>
                              {clicks === 0 ? '—' : `${conv}%`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-amber-700 font-semibold">+{(r.count * 300).toLocaleString()} XP</td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400">
                            {new Date(r.lastAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Referrals */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-indigo-500" /> Recent Referrals
            </h2>
            {referrals.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No referrals yet</p>
            ) : (
              <div className="space-y-2">
                {referrals.slice(0, 30).map(r => {
                  const referrer = userMap.get(r.referrer_id);
                  const referred = userMap.get(r.referred_id);
                  return (
                    <div key={r.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-2.5">
                      <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                        {referrer?.name[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{referrer?.name ?? 'Unknown'}</span>
                        <span className="text-gray-400 text-xs mx-2">invited</span>
                        <span className="text-sm font-medium text-gray-900">{referred?.name ?? 'Unknown'}</span>
                        {(referred?.contact_email || referred?.email) && <span className="text-xs text-gray-400 ml-1">({referred?.contact_email || referred?.email})</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.rewarded_at
                          ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">+400 XP</span>
                          : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Pending</span>}
                        <span className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {referrals.length > 30 && (
                  <p className="text-xs text-gray-400 text-center pt-1">Showing 30 of {referrals.length} referrals</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback tab */}
      {tab === 'feedback' && (
        <div className="space-y-3">
          {feedback.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No feedback yet</p>
          ) : [...feedback].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).map(f => <FeedbackCard key={f.id} f={f} chapterMap={chapterMap} />)}
        </div>
      )}

      {/* Rewards tab */}
      {tab === 'rewards' && (
        <RewardsTab users={users} gamification={gamification} milestones={milestones} />
      )}
    </div>
  );
}
