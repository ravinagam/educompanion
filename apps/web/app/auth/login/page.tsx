'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { BookOpen, Loader2 } from 'lucide-react';

function usernameToEmail(username: string) {
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@students.educompanion.app`;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <BookOpen className="h-8 w-8" />
              <span className="text-2xl font-bold">EduCompanion</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Your AI-powered study partner</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in with your username and password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Label htmlFor="password">Password</Label>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
