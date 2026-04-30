'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { BookOpen, Loader2 } from 'lucide-react';
import { BOARDS, GRADES } from '@educompanion/shared';

// Derives a deterministic internal email from username so Supabase Auth works
// without requiring users to provide or verify a real email address.
function usernameToEmail(username: string) {
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@students.educompanion.app`;
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    grade: '' as string,
    board: '' as string,
    contact_email: '',
    phone_number: '',
  });

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    if (!form.grade || !form.board) {
      toast.error('Please select your grade and board');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);

    const internalEmail = usernameToEmail(form.username);

    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password: form.password,
      options: {
        data: {
          name: form.name || form.username,
          username: form.username,
          grade: Number(form.grade),
          board: form.board,
          contact_email: form.contact_email.trim() || null,
          phone_number: form.phone_number.trim() || null,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      router.push('/onboarding');
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <BookOpen className="h-8 w-8" />
              <span className="text-2xl font-bold">EaseStudy</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Create your student account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Choose a username and password — no email needed</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="e.g. ravi_class9"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">Full Name <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Grade / Class</Label>
                  <Select onValueChange={(v: string | null) => setForm(f => ({ ...f, grade: v ?? '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map(g => (
                        <SelectItem key={g} value={String(g)}>Class {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Board</Label>
                  <Select onValueChange={(v: string | null) => setForm(f => ({ ...f, board: v ?? '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select board" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOARDS.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_email">Email <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.contact_email}
                  onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone_number">Phone Number <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone_number}
                  onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                />
              </div>
              <div className="flex items-start gap-2 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-gray-500 leading-snug cursor-pointer">
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-blue-600 hover:underline font-medium">
                    Terms of Use
                  </Link>
                  . I will only upload content I am legally entitled to use.
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Account
              </Button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
