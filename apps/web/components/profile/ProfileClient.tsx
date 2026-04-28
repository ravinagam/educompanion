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
