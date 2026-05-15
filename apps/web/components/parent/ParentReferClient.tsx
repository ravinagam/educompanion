'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Gift, Copy, Share2, Users, CheckCircle2, Clock } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  grade: number;
  board: string;
  joinedAt: string;
  rewarded: boolean;
}

interface Child {
  id: string;
  name: string;
  grade: number;
  board: string;
  referralCode: string | null;
  referralCount: number;
  friends: Friend[];
}

interface Props { children: Child[] }

export function ParentReferClient({ children }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyLink(child: Child) {
    if (!child.referralCode) return;
    const url = `https://easestudy.in/join?ref=${child.referralCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(child.id);
    toast.success('Link copied!');
    setTimeout(() => setCopied(null), 2000);
  }

  async function shareLink(child: Child) {
    if (!child.referralCode) return;
    const url = `https://easestudy.in/join?ref=${child.referralCode}`;
    const text = `My child ${child.name} uses EaseStudy for studying! Sign up at ${url} and both of you get a bonus!`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Join EaseStudy', text, url });
      } catch {
        await navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 md:px-0">
      {/* Page header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 px-6 py-5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl">Refer &amp; Earn</h1>
            <p className="text-violet-100 text-sm mt-0.5">Spread the word and help your child earn rewards!</p>
          </div>
        </div>
      </div>

      {children.map(child => (
        <Card key={child.id} className="border-0 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 flex items-center justify-between">
            <p className="text-white font-semibold text-sm">{child.name}</p>
            <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              Class {child.grade} · {child.board}
            </span>
          </div>
          <CardContent className="p-5 space-y-4">
            {/* Description */}
            <p className="text-sm text-gray-600">
              Share your referral link with friends. When they sign up, your child gets{' '}
              <span className="font-semibold text-violet-700">+300 XP</span> and they get a{' '}
              <span className="font-semibold text-violet-700">+100 XP welcome bonus</span>.
            </p>

            {child.referralCode ? (
              <>
                {/* Referral link */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Referral Link</p>
                  <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                    <span className="text-sm text-violet-800 font-mono flex-1 truncate">
                      easestudy.in/join?ref={child.referralCode}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(child)}
                    className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied === child.id ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => shareLink(child)}
                    className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </Button>
                </div>

                {/* Friends referred summary */}
                <div className="flex items-center gap-2 text-sm text-gray-600 pt-1 border-t border-gray-100">
                  <Users className="h-4 w-4 text-violet-400 shrink-0" />
                  <span>
                    <span className="font-semibold text-violet-700">{child.referralCount}</span>{' '}
                    {child.referralCount === 1 ? 'friend' : 'friends'} referred
                  </span>
                </div>

                {/* Friends list */}
                {child.friends.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Referred Friends</p>
                    {child.friends.map(friend => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0 text-violet-700 font-bold text-sm">
                            {friend.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{friend.name}</p>
                            <p className="text-xs text-gray-400">
                              Class {friend.grade} · {friend.board} · Joined{' '}
                              {new Date(friend.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        {friend.rewarded ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Rewarded
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1 shrink-0">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">Generating referral code…</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
