'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { BookOpen, Loader2, ArrowLeft } from 'lucide-react';

function usernameToEmail(username: string) {
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@students.educompanion.app`;
}

// Safety net: if someone lands on login with ?ref= (e.g. old links), save it
function RefCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) localStorage.setItem('ease_ref_code', ref.toUpperCase());
  }, [searchParams]);
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [form, setForm] = useState({ username: '', password: '' });
  const [forgotUsername, setForgotUsername] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim()) { toast.error('Enter your username'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(form.username),
      password: form.password,
    });
    if (error) {
      toast.error('Invalid username or password');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
    setLoading(false);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotUsername.trim()) { toast.error('Enter your username'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Account not found');
        setLoading(false);
        return;
      }
      window.location.href = data.link;
    } catch {
      toast.error('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={null}><RefCapture /></Suspense>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <BookOpen className="h-8 w-8" />
              <span className="text-2xl font-bold">EaseStudy</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Your AI-powered study partner</p>
        </div>

        <Card>
          <CardHeader>
            {mode === 'login' ? (
              <>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Sign in with your username and password</CardDescription>
              </>
            ) : (
              <>
                <CardTitle>Forgot Password</CardTitle>
                <CardDescription>Enter your username to get a reset link</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === 'login' ? (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Your username"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      autoCapitalize="none"
                      autoCorrect="off"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Your password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Sign In
                  </Button>
                </form>
                <p className="text-center text-sm text-gray-500">
                  New student?{' '}
                  <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">
                    Create account
                  </Link>
                </p>
              </>
            ) : (
              <>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="forgot-username">Username</Label>
                    <Input
                      id="forgot-username"
                      placeholder="Your username"
                      value={forgotUsername}
                      onChange={e => setForgotUsername(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Get Reset Link
                  </Button>
                </form>
                <button
                  onClick={() => setMode('login')}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
