import Link from 'next/link';
import {
  BookOpen, Users, Brain, Zap, Trophy, MessageCircle, Video,
  Upload, Layers, FileText, BarChart2, CalendarCheck, Play,
  CheckCircle2, ArrowRight,
} from 'lucide-react';

const studentFeatures = [
  {
    icon: Upload,
    color: 'blue',
    title: 'Upload any chapter',
    desc: 'Drop in a PDF, Word doc, or snap photos of your textbook. AI reads it and builds your study toolkit in under 30 seconds.',
  },
  {
    icon: Brain,
    color: 'violet',
    title: 'Auto-generated quizzes',
    desc: 'MCQs built specifically from your chapter — not generic. Take a quiz after each section to lock in what you learned.',
  },
  {
    icon: Layers,
    color: 'indigo',
    title: 'Flashcards with spaced repetition',
    desc: 'Flip through key terms and definitions. Score 80%+ on quizzes to earn bonus XP.',
  },
  {
    icon: Video,
    color: 'purple',
    title: 'Video lesson from your chapter',
    desc: 'EaseStudy turns your chapter into a visual slide-by-slide lesson with narration — great for revision.',
  },
  {
    icon: MessageCircle,
    color: 'teal',
    title: 'AI tutor — ask anything',
    desc: 'Stuck on a concept? Chat with an AI that only knows your chapter. Ask it to explain, give examples, or predict exam questions.',
  },
  {
    icon: Trophy,
    color: 'amber',
    title: 'Earn XP & Amazon vouchers',
    desc: 'Every quiz, flashcard session, and daily streak earns XP. Hit milestones to unlock real Amazon gift vouchers.',
  },
  {
    icon: CalendarCheck,
    color: 'emerald',
    title: 'Study planner & progress tracking',
    desc: 'Your dashboard shows streaks, XP, chapter progress, and a planner so you always know what to study next.',
  },
  {
    icon: FileText,
    color: 'orange',
    title: 'Chapter summaries',
    desc: 'Get a crisp AI-written recap of any chapter — perfect for last-minute revision before exams.',
  },
];

const parentFeatures = [
  {
    icon: BarChart2,
    color: 'violet',
    title: 'Quiz scores & accuracy trends',
    desc: "See your child's quiz scores over time with subject-wise breakdowns — know exactly which topics need more attention.",
  },
  {
    icon: CalendarCheck,
    color: 'emerald',
    title: 'Daily study streaks',
    desc: "Track how consistently your child is studying. A streak counter shows how many days in a row they've been active.",
  },
  {
    icon: Brain,
    color: 'indigo',
    title: 'AI insights every day',
    desc: 'Every day, EaseStudy generates a personalised report: strengths, areas to improve, and a tailored recommendation for your child.',
  },
  {
    icon: Trophy,
    color: 'amber',
    title: 'XP & reward milestones',
    desc: "Monitor XP earned and see which Amazon voucher milestones your child is working towards — great motivation.",
  },
  {
    icon: MessageCircle,
    color: 'teal',
    title: 'Subject mastery view',
    desc: 'A clear chart showing mastery level per subject so you can have informed conversations about study priorities.',
  },
  {
    icon: Users,
    color: 'purple',
    title: 'Simple parent login',
    desc: "Log in using your child's registered phone number and your password — no separate app or complicated setup.",
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500' },
};

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">

      {/* Nav */}
      <header className="px-6 py-3 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-indigo-700">
          <BookOpen className="h-6 w-6" />
          <span className="text-xl font-bold">EaseStudy</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-gray-500 hover:text-indigo-600 font-medium hidden sm:block">
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Get started free
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-12">

        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900">
            See how{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              EaseStudy works
            </span>
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            AI-powered study tools for students in Class 7–12, with a parent portal so families stay in the loop.
          </p>
        </div>

        {/* Feature video */}
        <div className="rounded-2xl overflow-hidden shadow-xl border border-indigo-100 max-w-3xl mx-auto">
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-3 border-b border-gray-200">
            <div className="flex gap-1.5 shrink-0">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 text-center border border-gray-100 truncate">
              easestudy.in — Feature Tour
            </div>
          </div>
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
          <div className="bg-indigo-50 px-4 py-2 flex items-center gap-2">
            <Play className="h-3.5 w-3.5 text-indigo-500 fill-indigo-500 shrink-0" />
            <p className="text-xs text-indigo-600 font-medium">4-minute feature tour — see everything before you sign up</p>
          </div>
        </div>

        {/* Two sections side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* For Students */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">For Students</h2>
                <p className="text-sm text-gray-500">Class 7–12 · Free · No app needed</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {studentFeatures.map(({ icon: Icon, color, title, desc }) => {
                const c = colorMap[color];
                return (
                  <div key={title} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${c.text} shrink-0`} />
                      <span className={`text-xs font-bold ${c.text}`}>{title}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-snug">{desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-1">
              <Link
                href="/auth/login"
                className="flex-1 text-center text-sm font-semibold bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 rounded-xl py-2.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="flex-1 text-center text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 transition-colors flex items-center justify-center gap-1"
              >
                Sign Up Free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {['Free First 100', 'Class 7–12', 'Hindi in Hindi', 'Works on Mobile'].map(label => (
                <span key={label} className="inline-flex items-center gap-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1 font-medium">
                  <CheckCircle2 className="h-3 w-3 text-indigo-500" /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* For Parents */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">For Parents</h2>
                <p className="text-sm text-gray-500">Stay informed · Daily AI reports · Free</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parentFeatures.map(({ icon: Icon, color, title, desc }) => {
                const c = colorMap[color];
                return (
                  <div key={title} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${c.text} shrink-0`} />
                      <span className={`text-xs font-bold ${c.text}`}>{title}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-snug">{desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-1">
              <Link
                href="/parent-login"
                className="flex-1 text-center text-sm font-semibold bg-white border border-violet-200 hover:border-violet-400 text-violet-700 rounded-xl py-2.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/parent-login?mode=register"
                className="flex-1 text-center text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2.5 transition-colors flex items-center justify-center gap-1"
              >
                Sign Up Free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-xs text-violet-800">
                <span className="font-semibold">How to sign up:</span> Ask your child to add your phone number in their Profile → &quot;Invite Your Parent&quot; card. Then register here using that number.
              </p>
            </div>
          </div>

        </div>

      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        © 2026 EaseStudy ·{' '}
        <Link href="/terms" className="hover:underline">Terms</Link>
        {' '}·{' '}
        <Link href="/" className="hover:underline">Home</Link>
      </footer>
    </div>
  );
}
