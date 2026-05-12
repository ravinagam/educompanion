'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { User, Mail, Phone, GraduationCap, BookOpen, Pencil, Check, X, LogOut } from 'lucide-react';

interface Profile {
  id: string; name: string; email: string; grade: number; board: string;
  contact_email: string | null; phone_number: string | null; created_at: string;
}

interface Props { profile: Profile }

export function ProfileClient({ profile }: Props) {
  const router = useRouter();
  const supabase = createClient();
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

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 px-4 md:px-6">
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

      {/* Profile Details */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-600 to-indigo-700 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <User className="h-4 w-4" /> Profile Details
          </div>
          {!editing ? (
            <Button onClick={() => setEditing(true)} variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5 h-7">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={cancel} variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 h-7 gap-1"><X className="h-3.5 w-3.5" />Cancel</Button>
              <Button onClick={save} disabled={saving} size="sm" className="bg-white text-indigo-700 hover:bg-white/90 h-7 gap-1"><Check className="h-3.5 w-3.5" />Save</Button>
            </div>
          )}
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {/* Row 1: Name | Class | Board */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Full Name</Label>
              {editing ? (
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium text-gray-900">{profile.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />Class</Label>
              <Badge className="bg-indigo-50 text-indigo-700 border-0">Class {profile.grade}</Badge>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Board</Label>
              <Badge className="bg-violet-50 text-violet-700 border-0">{profile.board}</Badge>
            </div>

            {/* Row 2: Email | Parent's Phone | Member since */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email <span className="normal-case text-gray-300">(optional)</span></Label>
              {editing ? (
                <Input type="email" placeholder="your@email.com" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
              ) : (
                <p className="text-sm text-gray-700">{profile.contact_email || <span className="text-gray-300 italic">Not provided</span>}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Parent&apos;s Phone <span className="normal-case text-gray-300">(Parent Login)</span></Label>
              {editing ? (
                <Input type="tel" placeholder="+91 98765 43210" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
              ) : (
                <p className="text-sm text-gray-700">{profile.phone_number || <span className="text-gray-300 italic">Not provided</span>}</p>
              )}
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <p className="text-xs text-gray-400">Member since</p>
              <p className="text-sm text-gray-600">{new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
