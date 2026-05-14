'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Flame, Trophy, FlaskConical, Layers, Star, Share2, Gift, CheckCircle2, Copy, Users, UserCheck, Loader2 } from 'lucide-react';
import { xpForLevel, xpForNextLevel } from '@/lib/gamification';
import { GIFT_MILESTONES } from '@/lib/gamification/milestones';

interface Profile {
  id: string; name: string; grade: number; board: string; phone_number: string | null;
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

interface ClaimedMilestone {
  xp_milestone: number;
  gifted_at: string;
  voucher_code: string | null;
  availed_at: string | null;
}

interface Props {
  profile: Profile;
  stats: Stats;
  claimedMilestones: ClaimedMilestone[];
  referralCode: string | null;
  referralCount: number;
}

function VoucherSection({ milestone, claimed, onAvailed }: {
  milestone: { xp: number; label: string };
  claimed: ClaimedMilestone;
  onAvailed: (xp: number) => void;
}) {
  const [availing, setAvailing] = useState(false);

  const markUsed = useCallback(async () => {
    setAvailing(true);
    try {
      const res = await fetch('/api/student/milestones/avail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xp_milestone: milestone.xp }),
      });
      if (res.ok) {
        toast.success('Marked as used!');
        onAvailed(milestone.xp);
      } else {
        const d = await res.json();
        toast.error(d.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    }
    setAvailing(false);
  }, [milestone.xp, onAvailed]);

  if (!claimed.voucher_code) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="bg-white border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-emerald-700 shrink-0">Voucher Code:</span>
        <span className="flex-1 font-mono text-sm font-bold text-gray-800 select-all">{claimed.voucher_code}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(claimed.voucher_code!); toast.success('Code copied!'); }}
          className="text-gray-400 hover:text-emerald-600 transition-colors"
          title="Copy code"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      {claimed.availed_at ? (
        <p className="text-[10px] text-gray-400 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Used on {new Date(claimed.availed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={markUsed}
          disabled={availing}
          className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          {availing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          {availing ? 'Saving…' : 'Mark as Used'}
        </Button>
      )}
    </div>
  );
}

export function RewardsClient({ profile, stats, claimedMilestones, referralCode, referralCount }: Props) {
  const statsCardRef = useRef<HTMLDivElement>(null);
  const shareBlobRef = useRef<Blob | null>(null);
  const [shareReady, setShareReady] = useState(false);
  const [milestones, setMilestones] = useState<ClaimedMilestone[]>(claimedMilestones);

  function handleAvailed(xp: number) {
    setMilestones(prev => prev.map(m =>
      m.xp_milestone === xp ? { ...m, availed_at: new Date().toISOString() } : m
    ));
  }

  // Pre-generate share image after mount
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
        setShareReady(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  function shareStats() {
    const g = stats.gamification;
    const fallbackText = [
      `📚 My Study Progress`,
      `─────────────`,
      `👤 ${profile.name} · Class ${profile.grade} ${profile.board}`,
      ``,
      g ? `⭐ Level ${g.level} · ${g.total_xp.toLocaleString()} XP` : `⭐ Just getting started!`,
      g ? `🔥 ${g.current_streak}-day study streak (Best: ${g.longest_streak} days)` : null,
      ``,
      `📝 ${stats.totalQuizzes} quiz${stats.totalQuizzes !== 1 ? 'zes' : ''} taken${stats.totalQuizzes > 0 ? ` · ${stats.avgScore}% avg score` : ''}`,
      `🃏 ${stats.flashcardsKnown} flashcard${stats.flashcardsKnown !== 1 ? 's' : ''} mastered`,
      `🏆 ${stats.chaptersMastered} chapter${stats.chaptersMastered !== 1 ? 's' : ''} fully mastered`,
      ``,
      `Studied using easestudy.in`,
    ].filter((l): l is string => l !== null).join('\n');

    const blob = shareBlobRef.current;
    if (blob) {
      const file = new File([blob], 'easestudy-stats.png', { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'My Study Stats — easestudy' }).catch(e => {
          if ((e as Error).name !== 'AbortError') toast.error('Share failed, try again');
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'easestudy-stats.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Stats image downloaded!');
      return;
    }
    if (!shareReady) toast('Image preparing, try again in a moment…');
    else if (navigator.share) {
      navigator.share({ title: 'My Study Stats', text: fallbackText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(fallbackText).then(() => toast.success('Stats copied to clipboard!'));
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 px-4 md:px-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">

        {/* Col 1 — Study Stats */}
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
                    <p className="text-xs text-gray-500">Chapters mastered</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Col 2 — Study Rewards */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center gap-2 text-white font-semibold text-sm">
            <Gift className="h-4 w-4" /> Study Rewards
          </div>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-gray-400">Earn Amazon vouchers by reaching XP milestones. Your voucher code will appear here once processed by the admin.</p>
            {GIFT_MILESTONES.map(milestone => {
              const totalXp = stats.gamification?.total_xp ?? 0;
              const claimed = milestones.find(c => c.xp_milestone === milestone.xp);
              const reached = totalXp >= milestone.xp;
              const progress = Math.min(100, Math.round((totalXp / milestone.xp) * 100));
              const remaining = milestone.xp - totalXp;
              return (
                <div key={milestone.xp} className={`rounded-xl border p-3 space-y-2 ${claimed ? 'bg-emerald-50 border-emerald-100' : reached ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {claimed
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <Gift className={`h-4 w-4 shrink-0 ${reached ? 'text-amber-500' : 'text-gray-300'}`} />
                      }
                      <span className={`text-sm font-semibold ${claimed ? 'text-emerald-700' : reached ? 'text-amber-700' : 'text-gray-500'}`}>
                        {milestone.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{milestone.xp.toLocaleString()} XP</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${claimed ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {claimed
                      ? `Milestone reached on ${new Date(claimed.gifted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : reached ? 'Milestone reached! Voucher being processed.'
                      : `${remaining.toLocaleString()} XP to go`
                    }
                  </p>
                  {claimed && (
                    <VoucherSection
                      milestone={milestone}
                      claimed={claimed}
                      onAvailed={handleAvailed}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Col 3 — Refer & Earn + Invite Parent */}
        <div className="space-y-5">

          <Card id="refer" className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3 flex items-center gap-2 text-white font-semibold text-sm">
              <Users className="h-4 w-4" /> Refer &amp; Earn
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Share your referral link with friends. When they sign up, you get <span className="font-semibold text-violet-700">+300 XP</span> and they get a <span className="font-semibold text-violet-700">+100 XP welcome bonus</span>.
              </p>
              {referralCode ? (
                <>
                  <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-violet-400 leading-none mb-1">Your referral link</p>
                    <p className="text-sm font-mono font-semibold text-violet-800 break-all">
                      easestudy.in/join?ref={referralCode}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-9 border-violet-200 text-violet-700 hover:bg-violet-50 gap-1.5"
                      onClick={() => { navigator.clipboard.writeText(`https://easestudy.in/join?ref=${referralCode}`); toast.success('Referral link copied!'); }}>
                      <Copy className="h-3.5 w-3.5" /> Copy Link
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-9 border-violet-200 text-violet-700 hover:bg-violet-50 gap-1.5"
                      onClick={async () => {
                        const url = `https://easestudy.in/join?ref=${referralCode}`;
                        if (navigator.share) {
                          try { await navigator.share({ title: 'Join EaseStudy', text: 'Sign up with my referral link and get +100 XP!', url }); }
                          catch { /* user cancelled */ }
                        } else {
                          navigator.clipboard.writeText(url);
                          toast.success('Referral link copied!');
                        }
                      }}>
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4 text-violet-400 shrink-0" />
                    <span>{referralCount === 0 ? 'No friends referred yet' : `${referralCount} friend${referralCount !== 1 ? 's' : ''} referred`}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                  Your referral code is being generated. Please check back in a moment.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-3 flex items-center gap-2 text-white font-semibold text-sm">
              <UserCheck className="h-4 w-4" /> Invite Your Parent
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Let your parent track your progress — quizzes, streaks, mastery, and AI-powered study insights — from their own dashboard.
              </p>
              <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 space-y-2 text-sm">
                <p className="text-teal-700 font-medium">How it works:</p>
                <ol className="text-teal-600 space-y-1 list-decimal list-inside text-xs leading-relaxed">
                  <li>Share this message with your parent</li>
                  <li>They visit <span className="font-mono font-semibold">easestudy.in/parent-login</span></li>
                  <li>They register using their phone number as the login ID</li>
                </ol>
              </div>
              {profile.phone_number ? (
                <div className="space-y-2">
                  <div className="bg-white border border-teal-100 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-teal-400 leading-none mb-1">Your parent&apos;s phone number (their login ID)</p>
                    <p className="text-sm font-mono font-semibold text-teal-800">{profile.phone_number}</p>
                  </div>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
                    onClick={async () => {
                      const msg = `Hi! You can track my EaseStudy study progress from the Parent Portal.\n\n👉 Visit: https://easestudy.in/parent-login\n📱 Register using your phone number: ${profile.phone_number}\n\nYou'll see my quiz scores, study streaks, chapter mastery, and personalised AI insights!`;
                      if (navigator.share) {
                        try { await navigator.share({ title: 'Track my EaseStudy progress', text: msg }); }
                        catch { /* user cancelled */ }
                      } else {
                        navigator.clipboard.writeText(msg);
                        toast.success('Message copied! Send it to your parent.');
                      }
                    }}>
                    <Share2 className="h-4 w-4" /> Share with Parent
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  Add your parent&apos;s phone number in <a href="/profile" className="underline font-medium">Profile</a> to enable the Parent Portal.
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
