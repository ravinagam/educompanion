import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, Users, ChevronRight, Brain, BarChart2, Zap } from 'lucide-react';

export default async function LandingPage() {
  // Redirect logged-in users to their respective dashboards
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    if (user.user_metadata?.role === 'parent') redirect('/parent');
    else redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col">
      {/* Nav */}
      <header className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 text-indigo-700">
          <BookOpen className="h-6 w-6" />
          <span className="text-xl font-bold">EaseStudy</span>
        </div>
        <span className="text-xs text-gray-400">AI-powered learning</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">

            {/* Left — CTA */}
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Brain className="h-3.5 w-3.5" /> Personalised AI Learning for Indian Students
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
                Smart learning,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  smarter progress.
                </span>
              </h1>
              <p className="text-gray-500 text-lg mb-8">
                Upload your textbook chapters and let AI generate quizzes, flashcards, video lessons, and personalised study plans — in minutes.
              </p>

              {/* Login cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <Link
                  href="/auth/login"
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 p-6 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold mb-1">I&apos;m a Student</h2>
                    <p className="text-blue-100 text-sm mb-4">
                      Study smarter with AI-powered quizzes, flashcards, video summaries and more.
                    </p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      Sign In <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>

                <Link
                  href="/parent-login"
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold mb-1">I&apos;m a Parent</h2>
                    <p className="text-purple-100 text-sm mb-4">
                      Track your child&apos;s progress with AI-powered insights, SWOT analysis, and personalised recommendations.
                    </p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      View Dashboard <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>

              <p className="text-sm text-gray-400 mt-3">
                New student?{' '}
                <Link href="/auth/signup" className="text-indigo-600 hover:underline font-medium">
                  Create a free account
                </Link>
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  { icon: Brain, label: 'AI Quiz Generator' },
                  { icon: Zap, label: 'Flashcards' },
                  { icon: BarChart2, label: 'Progress Tracking' },
                  { icon: BookOpen, label: 'Video Summaries' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-100 rounded-full px-3 py-1.5 shadow-sm">
                    <Icon className="h-3.5 w-3.5 text-indigo-500" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Feature video */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-500 text-center">
                See everything in action — 4 min tour
              </p>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-indigo-100">
                <video
                  src="/easestudy-features-v3.mp4"
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full block"
                >
                  Your browser does not support video playback.
                </video>
                <div className="bg-indigo-50 px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs text-indigo-600 font-medium">Quizzes · Flashcards · Video · AI Tutor · Parent Portal</p>
                  <p className="text-xs text-indigo-300">Free forever</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        © 2026 EaseStudy ·{' '}
        <Link href="/terms" className="hover:underline">Terms</Link>
      </footer>
    </div>
  );
}
