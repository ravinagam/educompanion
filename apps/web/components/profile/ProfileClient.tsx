'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { User, Mail, Phone, GraduationCap, BookOpen, Pencil, Check, X, LogOut, Flame, Trophy, FlaskConical, Layers, Star, Share2 } from 'lucide-react';
import { xpForLevel, xpForNextLevel } from '@/lib/gamification';

interface Profile {
  id: string; name: string; email: string; grade: number; board: string;
  contact_email: string | null; phone_number: string | null; created_at: string;
}

interface GamificationData {
  total_xp: number; level: number; current_streak: number; longest_streak: number;
}

interface Stats {
  gamification: GamificationData | null;
  totalQuizzes: number;
  avgScore: number;
  flashcardsKnown: number;
  chaptersMastered: number;
}

interface Props { profile: Profile; stats: Stats }

export function ProfileClient({ profile, stats }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const statsCardRef = useRef<HTMLDivElement>(null);
  const shareBlobRef = useRef<Blob | null>(null);
  const [shareReady, setShareReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: profile.name,
    contact_email: profile.contact_email ?? '',
    phone_number: profile.phone_number ?? '',
  });

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('users').update({
      name: form.name.trim() || profile.name,
      contact_email: form.contact_email.trim() || null,
      phone_number: form.phone_number.trim() || null,
    }).eq('id', profile.id);

    if (error) {
      toast.error('Failed to save changes');
    } else {
      toast.success('Profile updated');
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  }

  function cancel() {
    setForm({ name: profile.name, contact_email: profile.contact_email ?? '', phone_number: profile.phone_number ?? '' });
    setEditing(false);
  }

  // Pre-generate the share image in the background after mount so tap is instant
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (statsCardRef.current) {
          const h2c = (await import('html2canvas')).default;
          const canvas = await h2c(statsCardRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
          await new Promise<void>(resolve => {
            canvas.toBlob(blob => {
              if (blob) shareBlobRef.current = blob;
              resolve();
            }, 'image/png');
          });
        }
      } catch (e) {
        console.warn('[share] image generation failed:', e);
      } finally {
        setShareReady(true); // always unlock the button
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  function shareStats() {
    const g = stats.gamification;
    const fallbackText = [
      `📚 My easestudy Study Progress`,
      `👤 ${profile.name} · Class ${profile.grade} ${profile.board}`,
      ``,
      g ? `⭐ Level ${g.level} · ${g.total_xp.toLocaleString()} XP` : `⭐ Just getting started!`,
      g ? `🔥 ${g.current_streak}-day study streak (Best: ${g.longest_streak} days)` : null,
      ``,
      `📝 ${stats.totalQuizzes} quiz${stats.totalQuizzes !== 1 ? 'zes' : ''} taken${stats.totalQuizzes > 0 ? ` · ${stats.avgScore}% avg score` : ''}`,
      `🃏 ${stats.flashcardsKnown} flashcard${stats.flashcardsKnown !== 1 ? 's' : ''} mastered`,
      `🏆 ${stats.chaptersMastered} chapter${stats.chaptersMastered !== 1 ? 's' : ''} fully mastered`,
      ``,
      `Studied using easestudy`,
    ].filter(Boolean).join('\n');

    const blob = shareBlobRef.current;

    if (blob) {
      const file = new File([blob], 'easestudy-stats.png', { type: 'image/png' });

      // Mobile: native share sheet with image — called synchronously within tap gesture
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'My Study Stats — easestudy' }).catch(e => {
          if ((e as Error).name !== 'AbortError') toast.error('Share failed, try again');
        });
        return;
      }

      // Desktop: download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'easestudy-stats.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Stats image downloaded!');
      return;
    }

    // Image not ready yet or capture failed — fall back to text
    if (!shareReady) toast('Image preparing, try again in a moment…');
    else if (navigator.share) {
      navigator.share({ title: 'My Study Stats', text: fallbackText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(fallbackText).then(() => toast.success('Stats copied to clipboard!'));
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 px-6 py-5 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg">{profile.name}</p>
            <p className="text-blue-100 text-sm">Class {profile.grade} · {profile.board}</p>
          </div>
        </div>
        <Button onClick={signOut} variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-white/10 gap-1.5">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* Study Stats */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-blue-100 px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Study Stats</p>
          <Button onClick={shareStats} variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800 gap-1.5 h-7">
            <Share2 className="h-3.5 w-3.5" /> {shareReady ? 'Share' : 'Share…'}
          </Button>
        </div>
        <CardContent className="p-5 space-y-4">
          <div ref={statsCardRef} className="space-y-4">
          {stats.gamification ? (() => {
            const g = stats.gamification;
            const levelStart = xpForLevel(g.level);
            const levelEnd = xpForNextLevel(g.level);
            const isMax = g.level >= 10;
            const progress = !isMax && levelEnd > levelStart
              ? Math.min(100, Math.round(((g.total_xp - levelStart) / (levelEnd - levelStart)) * 100))
              : 100;
            return (
              <>
                {/* Level + XP */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white text-xl font-bold shrink-0">
                    {g.level}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Level {g.level}</p>
                    <p className="text-xs text-gray-500 mb-1">{g.total_xp.toLocaleString()} XP total</p>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {isMax ? 'Max level reached!' : `${levelEnd - g.total_xp} XP to level ${g.level + 1}`}
                    </p>
                  </div>
                </div>

                {/* Streak */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                  <Flame className="h-6 w-6 text-orange-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{g.current_streak}-day streak</p>
                    <p className="text-xs text-gray-500">Best: {g.longest_streak} days</p>
                  </div>
                  {g.current_streak >= 3 && (
                    <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200">
                      {g.current_streak >= 7 ? '2× XP' : '1.5× XP'}
                    </Badge>
                  )}
                </div>
              </>
            );
          })() : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <Star className="h-5 w-5 text-gray-300" />
              <p className="text-sm text-gray-400">Complete your first activity to start earning XP!</p>
            </div>
          )}

          {/* Activity stats grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.totalQuizzes}</p>
                <p className="text-xs text-gray-500">Quizzes taken</p>
                {stats.totalQuizzes > 0 && <p className="text-[10px] text-indigo-500">{stats.avgScore}% avg score</p>}
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-3">
              <Layers className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.flashcardsKnown}</p>
                <p className="text-xs text-gray-500">Flashcards known</p>
              </div>
            </div>
            <div className="col-span-2 rounded-xl bg-yellow-50 border border-yellow-100 p-3 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-yellow-500 shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.chaptersMastered}</p>
                <p className="text-xs text-gray-500">Chapters mastered (quiz ≥60% + 3 flashcards known)</p>
              </div>
            </div>
          </div>
          </div>{/* end statsCardRef div */}
        </CardContent>
      </Card>

      {/* Details card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-blue-100 px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Profile Details</p>
          {!editing ? (
            <Button onClick={() => setEditing(true)} variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800 gap-1.5 h-7">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={cancel} variant="ghost" size="sm" className="text-gray-500 h-7 gap-1"><X className="h-3.5 w-3.5" />Cancel</Button>
              <Button onClick={save} disabled={saving} size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-7 gap-1"><Check className="h-3.5 w-3.5" />Save</Button>
            </div>
          )}
        </div>
        <CardContent className="p-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Full Name</Label>
            {editing ? (
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            ) : (
              <p className="text-sm font-medium text-gray-900">{profile.name}</p>
            )}
          </div>

          {/* Grade & Board — read only */}
          <div className="flex gap-4">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />Class</Label>
              <Badge className="bg-indigo-50 text-indigo-700 border-0">Class {profile.grade}</Badge>
            </div>
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Board</Label>
              <Badge className="bg-violet-50 text-violet-700 border-0">{profile.board}</Badge>
            </div>
          </div>

          {/* Contact Email */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email <span className="normal-case text-gray-300">(optional)</span></Label>
            {editing ? (
              <Input type="email" placeholder="your@email.com" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
            ) : (
              <p className="text-sm text-gray-700">{profile.contact_email || <span className="text-gray-300 italic">Not provided</span>}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Phone <span className="normal-case text-gray-300">(optional)</span></Label>
            {editing ? (
              <Input type="tel" placeholder="+91 98765 43210" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
            ) : (
              <p className="text-sm text-gray-700">{profile.phone_number || <span className="text-gray-300 italic">Not provided</span>}</p>
            )}
          </div>

          {/* Member since */}
          <div className="pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-400">Member since {new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
