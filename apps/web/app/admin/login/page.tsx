'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Loader2 } from 'lucide-react';

const ADMIN_EMAIL = 'ravi.nagam.kiran@gmail.com';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (form.email !== ADMIN_EMAIL) {
      toast.error('Not authorised as admin');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      toast.error('Invalid credentials');
    } else {
      router.push('/admin');
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">EasyMyStudy Admin</h1>
          <p className="text-gray-400 text-sm">Sign in with your admin credentials</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Email</Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-indigo-500"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-indigo-500"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in…</>
                : 'Sign in to Admin'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
