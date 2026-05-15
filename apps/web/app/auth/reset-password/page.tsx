'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = searchParams.get('portal'); // 'parent' | null
  const supabase = createClient();

  const [status, setStatus] = useState<'verifying' | 'ready' | 'invalid'>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase processes the #access_token fragment and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStatus('ready');
      }
    });

    // Fallback: if already in a recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus('ready');
    });

    // If no event fires within 5s, the link is invalid/expired
    const timer = setTimeout(() => {
      setStatus(s => s === 'verifying' ? 'invalid' : s);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push(portal === 'parent' ? '/parent-login' : '/auth/login');
      }, 2000);
    }
  }

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-sm text-gray-400">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center space-y-3">
            <p className="font-semibold text-gray-900">Link expired or invalid</p>
            <p className="text-sm text-gray-500">Please request a new password reset link.</p>
            <Button variant="outline" className="w-full" onClick={() =>
              router.push(portal === 'parent' ? '/parent-login' : '/auth/login')
            }>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <p className="font-semibold text-gray-900">Password updated!</p>
          <p className="text-sm text-gray-400">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-md ${portal === 'parent' ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-blue-600'}`}>
              <KeyRound className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-sm text-gray-500">
            {portal === 'parent' ? 'Parent Portal' : 'EaseStudy'}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Choose a new password</CardTitle>
            <CardDescription>Must be at least 8 characters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className={`w-full ${portal === 'parent' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700' : ''}`}
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
