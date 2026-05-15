'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createParentBrowserClient } from '@/lib/supabase/parent-browser';
import { Users, Phone, KeyRound, LogOut, Check, X, Eye, EyeOff, Pencil } from 'lucide-react';
import { formatParentPhone } from '@/lib/parent-auth';

interface Props { phone: string; email: string }

export function ParentProfileClient({ phone, email }: Props) {
  const router = useRouter();
  const supabase = createParentBrowserClient();

  const displayPhone = formatParentPhone(phone);

  const [changingPw, setChangingPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });

  async function changePassword() {
    if (pwForm.next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setPwSaving(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: pwForm.current });
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

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/parent-login');
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 px-4 md:px-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 px-6 py-5 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg">Parent</p>
            <p className="text-violet-100 text-sm">{displayPhone}</p>
          </div>
        </div>
        <Button onClick={signOut} variant="ghost" size="sm" className="text-violet-200 hover:text-white hover:bg-white/10 gap-1.5">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* Account Info */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-600 to-violet-700 px-5 py-3">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Users className="h-4 w-4" /> Account Details
          </div>
        </div>
        <CardContent className="p-5">
          <div className="space-y-1.5 max-w-xs">
            <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Phone Number
            </Label>
            <p className="text-sm font-medium text-gray-900">{displayPhone}</p>
            <p className="text-xs text-gray-400">This is your login identifier and cannot be changed.</p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-600 to-violet-700 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <KeyRound className="h-4 w-4" /> Security
          </div>
          {!changingPw && (
            <Button onClick={() => setChangingPw(true)} variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5 h-7">
              <Pencil className="h-3.5 w-3.5" /> Change Password
            </Button>
          )}
        </div>
        <CardContent className="p-5">
          {!changingPw ? (
            <p className="text-sm text-gray-500">Click <span className="font-medium text-gray-700">Change Password</span> to update your login password.</p>
          ) : (
            <div className="max-w-sm space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={pwForm.current}
                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                    className="pr-9"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">New Password</Label>
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Confirm New Password</Label>
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={changePassword} disabled={pwSaving} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-1">
                  {pwSaving
                    ? <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Saving…</>
                    : <><Check className="h-3.5 w-3.5" /> Update Password</>}
                </Button>
                <Button onClick={() => { setChangingPw(false); setPwForm({ current: '', next: '', confirm: '' }); }} variant="ghost" size="sm" className="text-gray-500 gap-1">
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
