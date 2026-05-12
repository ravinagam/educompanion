'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, Loader2, BookOpen, ArrowLeft } from 'lucide-react';
import { phoneToParentEmail } from '@/lib/parent-auth';

function ParentLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ phone: '', password: '', confirmPassword: '' });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone.trim()) { toast.error('Enter your phone number'); return; }
    setLoading(true);
    const digits = form.phone.replace(/\D/g, '');
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToParentEmail(digits),
      password: form.password,
    });
    if (error) {
      if (error.message.includes('Invalid login')) {
        toast.error('Incorrect phone number or password. New here? Create an account.');
      } else {
        toast.error(error.message);
      }
    } else {
      router.push('/parent');
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone.trim()) { toast.error('Enter your phone number'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);

    const res = await fetch('/api/parent/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: form.phone, password: form.password }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        toast.error('Account already exists. Please sign in.');
        setMode('login');
      } else {
        toast.error(data.error ?? 'Registration failed');
      }
      setLoading(false);
      return;
    }

    // Auto sign-in after registration
    const digits = form.phone.replace(/\D/g, '');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: phoneToParentEmail(digits),
      password: form.password,
    });
    if (signInError) {
      toast.success('Account created! Please sign in.');
      setMode('login');
    } else {
      router.push('/parent');
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
            <p className="text-gray-500 text-sm mt-1">Track your child's learning progress</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Use the phone number registered with your child\'s account'
                : 'Use the same phone number your child entered during registration'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Parent Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  required
                />
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
              {mode === 'register' && (
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>
                  First time?{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="text-violet-600 hover:underline font-medium"
                  >
                    Create parent account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-violet-600 hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Your child must have added your phone number in their EaseStudy profile.
                Ask them to go to Profile → Phone Number.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-gray-400 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            <span>EaseStudy — AI-powered learning platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParentLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md px-4">
          <div className="h-14 w-14 rounded-2xl bg-violet-100 mx-auto" />
          <div className="h-8 bg-gray-100 rounded w-1/2 mx-auto" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    }>
      <ParentLoginContent />
    </Suspense>
  );
}
