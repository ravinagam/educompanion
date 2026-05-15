'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createParentBrowserClient } from '@/lib/supabase/parent-browser';
import { BookOpen, LogOut, Users, KeyRound, X, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function ParentHeader() {
  const router = useRouter();
  const supabase = createParentBrowserClient();
  const [changingPw, setChangingPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/parent-login');
    router.refresh();
  }

  async function changePassword() {
    if (pwForm.next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setPwSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { toast.error('Session expired — please sign in again'); setPwSaving(false); return; }
    // Verify current password
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwForm.current,
    });
    if (authErr) { toast.error('Current password is incorrect'); setPwSaving(false); return; }
    const { error: updateErr } = await supabase.auth.updateUser({ password: pwForm.next });
    if (updateErr) {
      toast.error('Failed to update password');
    } else {
      toast.success('Password changed successfully');
      setChangingPw(false);
      setPwForm({ current: '', next: '', confirm: '' });
    }
    setPwSaving(false);
  }

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-indigo-700">
            <BookOpen className="h-5 w-5" />
            <span className="font-bold text-lg">EaseStudy</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5 text-sm text-violet-700 font-medium">
            <Users className="h-4 w-4" />
            Parent Portal
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setChangingPw(v => !v)} className="text-gray-500 hover:text-gray-700 gap-1.5">
            <KeyRound className="h-4 w-4" /> Change Password
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-500 hover:text-gray-700 gap-1.5">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Change password panel */}
      {changingPw && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap gap-3 flex-1">
                <div className="space-y-1 min-w-[180px]">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Current password"
                      value={pwForm.current}
                      onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                      className="pr-9 h-8 text-sm"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1 min-w-[180px]">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">New Password</Label>
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={pwForm.next}
                    onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 min-w-[180px]">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Confirm New Password</Label>
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={changePassword} disabled={pwSaving} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white h-8 gap-1">
                    {pwSaving ? <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Saving…</> : <><Check className="h-3.5 w-3.5" /> Update</>}
                  </Button>
                </div>
              </div>
              <button onClick={() => { setChangingPw(false); setPwForm({ current: '', next: '', confirm: '' }); }} className="text-gray-400 hover:text-gray-600 mt-5">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
