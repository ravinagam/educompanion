'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { BookMarked, Check, Loader2, Plus, X } from 'lucide-react';
import { DEFAULT_SUBJECTS_BY_GRADE } from '@educompanion/shared';

const STEPS = ['Welcome', 'Subjects'] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [grade, setGrade] = useState<number>(9);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.grade) {
        setGrade(Number(user.user_metadata.grade));
      }
    });
  }, []);

  const suggestions = DEFAULT_SUBJECTS_BY_GRADE[grade] ?? [];

  function toggleSubject(name: string) {
    setSelectedSubjects(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  }

  function addCustom() {
    const t = customSubject.trim();
    if (!t) return;
    if (!selectedSubjects.includes(t)) setSelectedSubjects(prev => [...prev, t]);
    setCustomSubject('');
  }

  async function handleFinish() {
    if (!selectedSubjects.length) {
      toast.error('Select at least one subject');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }

    const meta = user.user_metadata ?? {};
    const userGrade = Number(meta.grade) || grade;

    // Upsert public.users — row may not exist yet after username/password signup
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        name: meta.name || meta.username || 'Student',
        email: user.email ?? '',
        grade: userGrade,
        board: meta.board ?? 'CBSE',
        contact_email: meta.contact_email ?? null,
        phone_number: meta.phone_number ?? null,
        onboarding_done: true,
      }, { onConflict: 'id' });

    if (profileError) { toast.error(profileError.message); setLoading(false); return; }

    // Create subjects (subjects.user_id FK → public.users, so profile must exist first)
    for (const name of selectedSubjects) {
      await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    }

    toast.success('Setup complete! Welcome to EduCompanion');
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-blue-600 text-white p-3 rounded-2xl">
              <BookMarked className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to EduCompanion!</h1>
          <p className="text-gray-500">Let&apos;s set up your learning profile</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < step ? 'bg-blue-600 text-white' :
                i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  EduCompanion helps you study smarter with AI-generated quizzes,
                  flashcards, and personalized study plans. All tied to your actual textbook material.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-blue-900 text-sm">What you can do:</p>
                  {[
                    '📤 Upload chapter PDFs or notes',
                    '📅 Plan study sessions for upcoming tests',
                    '🧠 Practice with AI-generated quizzes',
                    '🎴 Master topics with smart flashcards',
                    '🎥 Watch AI-generated video explanations',
                  ].map(item => (
                    <p key={item} className="text-blue-800 text-sm">{item}</p>
                  ))}
                </div>
                <Button className="w-full" onClick={() => setStep(1)}>
                  Get Started →
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Select your subjects. You can add more later.</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <Badge
                      key={s}
                      variant={selectedSubjects.includes(s) ? 'default' : 'outline'}
                      className="cursor-pointer text-sm py-1 px-3 select-none"
                      onClick={() => toggleSubject(s)}
                    >
                      {selectedSubjects.includes(s) && <Check className="h-3 w-3 mr-1" />}
                      {s}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom subject..."
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustom()}
                  />
                  <Button variant="outline" size="icon" onClick={addCustom}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {selectedSubjects.filter(s => !suggestions.includes(s)).map(s => (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{s}</Badge>
                    <button onClick={() => toggleSubject(s)} className="text-gray-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                  <Button className="flex-1" onClick={handleFinish} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Start Learning!
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
