import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  BookOpen, Users, ChevronRight, Brain, Zap, Trophy, MessageCircle, Play,
  CheckCircle2, BarChart2, Video,
} from 'lucide-react';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    if (user.user_metadata?.role === 'parent') redirect('/parent');
    else redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex flex-col relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-200 opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-200 opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-100 opacity-20 blur-3xl" />

      {/* Nav */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2 text-indigo-700">
          <BookOpen className="h-6 w-6" />
          <span className="text-xl font-bold">EaseStudy</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/how-to-use" className="text-sm text-gray-500 hover:text-indigo-600 font-medium hidden sm:block">
            How it works
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Get started free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 lg:py-10">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">

            {/* ── Left: CTA ── */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-bold px-4 py-1.5 rounded-full mb-5 tracking-wide uppercase">
                <Brain className="h-3.5 w-3.5" /> AI-Powered · Class 8–10 · India
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-5xl font-black text-gray-900 leading-tight mb-4">
                Your AI study<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600">
                  partner for exams.
                </span>
              </h1>

              <p className="text-gray-500 text-base lg:text-lg mb-8 max-w-md">
                Upload any chapter. Get quizzes, flashcards, a video lesson, AI tutor,
                and progress tracking — free, in under 30 seconds.
              </p>

              {/* Login cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg lg:max-w-none">

                {/* Student */}
                <Link
                  href="/auth/login"
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 p-5 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
                  <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold mb-2">I&apos;m a Student</h2>
                    <ul className="space-y-1 mb-4">
                      {[
                        'Quizzes, flashcards & video lessons',
                        'AI tutor for any chapter question',
                        'Earn XP & Amazon vouchers',
                      ].map(pt => (
                        <li key={pt} className="flex items-start gap-1.5 text-xs text-blue-100">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-200" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      Sign In <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>

                {/* Parent */}
                <Link
                  href="/parent-login"
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
                  <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                      <Users className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold mb-2">I&apos;m a Parent</h2>
                    <ul className="space-y-1 mb-4">
                      {[
                        'Track quiz scores & study streaks',
                        'Daily AI insights & recommendations',
                        "Login with child's phone number",
                      ].map(pt => (
                        <li key={pt} className="flex items-start gap-1.5 text-xs text-purple-100">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-purple-200" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      View Dashboard <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>

              <p className="text-sm text-gray-400 mt-3">
                New student?{' '}
                <Link href="/auth/signup" className="text-indigo-600 hover:underline font-semibold">
                  Create a free account →
                </Link>
              </p>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-6">
                {[
                  { icon: Trophy,         label: 'Free Forever' },
                  { icon: BookOpen,       label: 'Class 8–10' },
                  { icon: MessageCircle,  label: 'Hindi & English' },
                  { icon: Zap,            label: 'No App Needed' },
                  { icon: BarChart2,      label: 'Parent Portal' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm font-medium">
                    <Icon className="h-3.5 w-3.5 text-indigo-500" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right: Feature video ── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-center gap-2">
                <Play className="h-4 w-4 text-indigo-600 fill-indigo-600" />
                <p className="text-sm font-semibold text-gray-700">4-minute feature tour — see everything before you sign up</p>
              </div>

              {/* Browser mockup frame */}
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-gray-200 bg-white">
                {/* Chrome bar */}
                <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-3 border-b border-gray-200">
                  <div className="flex gap-1.5 shrink-0">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 text-center border border-gray-100 truncate">
                    easestudy.in — Feature Tour
                  </div>
                </div>

                {/* Video */}
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full block bg-gray-900"
                  style={{ aspectRatio: '16/9' }}
                >
                  <source src="/easestudy-features-v3.mp4" type="video/mp4" />
                  Your browser does not support video playback.
                </video>

                {/* Feature tag strip */}
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { icon: Brain,   label: 'Quiz' },
                      { icon: Zap,     label: 'Flashcards' },
                      { icon: Video,   label: 'Video' },
                      { icon: MessageCircle, label: 'AI Tutor' },
                      { icon: Users,   label: 'Parent Portal' },
                    ].map(({ icon: Icon, label }) => (
                      <span key={label} className="inline-flex items-center gap-1 text-[11px] bg-white border border-indigo-100 text-indigo-700 rounded-full px-2.5 py-0.5 font-semibold shadow-sm">
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">4 min · free</span>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400">
                Can&apos;t watch now?{' '}
                <Link href="/how-to-use" className="text-indigo-500 hover:underline font-medium">
                  Read the step-by-step guide →
                </Link>
              </p>
            </div>

          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-5 text-xs text-gray-400">
        © 2026 EaseStudy ·{' '}
        <Link href="/terms" className="hover:underline">Terms</Link>
      </footer>
    </div>
  );
}
