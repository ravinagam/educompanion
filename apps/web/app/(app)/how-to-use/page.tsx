import Link from 'next/link';
import {
  Upload, BookOpen, Brain, MessageCircle, LayoutDashboard,
  FileText, Layers, Video, CalendarCheck, Lightbulb, ArrowRight,
  Camera, Sparkles,
} from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Upload,
    color: 'blue',
    title: 'Upload a chapter',
    href: '/upload',
    cta: 'Go to Upload',
    body: 'Start by uploading any chapter you want to study. You can drop in a PDF, Word doc, or plain text file. Got a physical textbook? Switch to "Upload Screenshots" and snap photos of the pages — AI will read the text for you.',
    tips: ['PDF and Word files work best', 'Screenshots mode is great for physical textbooks', 'Processing usually takes 15–30 seconds'],
  },
  {
    number: 2,
    icon: BookOpen,
    color: 'emerald',
    title: 'Read it section by section',
    href: '/chapters',
    cta: 'My Chapters',
    body: 'Once your chapter is ready, EaseStudy breaks it into bite-sized sections automatically. Work through each section at your own pace and mark them done as you go — you\'ll see your progress fill up.',
    tips: ['Tap a section to open the reading view', 'Mark sections complete as you finish them', 'Your progress is saved automatically'],
  },
  {
    number: 3,
    icon: Brain,
    color: 'violet',
    title: 'Test yourself',
    href: '/chapters',
    cta: 'My Chapters',
    body: 'After reading, hit the Quiz or Flashcards button on any chapter or section. EaseStudy generates questions straight from your uploaded content — not generic questions, but ones specifically about your chapter.',
    tips: ['Score 80%+ to earn bonus XP', 'Flashcards use spaced repetition to help things stick', 'You can regenerate a new quiz any time'],
  },
  {
    number: 4,
    icon: MessageCircle,
    color: 'teal',
    title: 'Ask AI anything',
    href: '/chapters',
    cta: 'My Chapters',
    body: 'Stuck on something? Open the "Ask AI" chat on any chapter or section. Ask it to explain a concept, give you an example, simplify something, or predict what might come in your exam. It only answers from your uploaded content.',
    tips: ['Try the starter questions to get going fast', 'Your chat history is saved so you can come back', 'Ask "what exam questions come from this chapter?" for quick prep'],
  },
  {
    number: 5,
    icon: LayoutDashboard,
    color: 'amber',
    title: 'Track your progress',
    href: '/dashboard',
    cta: 'Go to Dashboard',
    body: 'Your dashboard shows how much you\'ve studied, your current streak, XP earned, and your level. Study every day to keep your streak alive — a 3-day streak gives you 1.5× XP, and a 7-day streak doubles it.',
    tips: ['Check your dashboard daily to stay on track', 'Use the Study Planner to schedule what to study next', 'Hit XP milestones to unlock Amazon voucher rewards'],
  },
];

const features = [
  { icon: FileText,      color: 'blue',   name: 'Summary',       desc: 'Get a quick AI-written recap of any chapter' },
  { icon: Video,         color: 'purple', name: 'Video Lesson',  desc: 'Watch a visual slide-by-slide lesson generated from your chapter' },
  { icon: Layers,        color: 'indigo', name: 'Flashcards',    desc: 'Flip through key terms and definitions with spaced repetition' },
  { icon: Brain,         color: 'violet', name: 'Quiz',          desc: 'Answer MCQs built from your exact chapter content' },
  { icon: MessageCircle, color: 'teal',   name: 'Ask AI',        desc: 'Chat with an AI tutor that only knows your chapter' },
  { icon: CalendarCheck, color: 'amber',  name: 'Study Planner', desc: 'Plan your study sessions and track what\'s coming up' },
];

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  badge: 'bg-blue-600' },
  emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',badge: 'bg-emerald-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200',badge: 'bg-violet-600' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',  badge: 'bg-teal-600' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', badge: 'bg-amber-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200',badge: 'bg-purple-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',badge: 'bg-indigo-600' },
};

export default function HowToUsePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-10">

      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-1">
          <Sparkles className="h-3 w-3" /> Quick guide
        </div>
        <h1 className="text-2xl font-bold text-gray-900">How to use EaseStudy</h1>
        <p className="text-gray-500 text-sm">
          Five steps and you&apos;re set. Takes about two minutes to get started.
        </p>
      </div>

      {/* Feature video */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-indigo-100">
        <video
          src="/easestudy-features-v3.mp4"
          controls
          playsInline
          preload="metadata"
          className="w-full"
          style={{ display: 'block' }}
        >
          Your browser does not support video playback.
        </video>
        <div className="bg-indigo-50 px-4 py-2 flex items-center justify-between">
          <p className="text-xs text-indigo-600 font-medium">Watch this 4-min overview to see all features in action</p>
          <p className="text-xs text-indigo-400">EaseStudy Feature Tour · v3</p>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {steps.map((step) => {
          const Icon = step.icon;
          const c = colorMap[step.color];
          return (
            <div key={step.number} className={`rounded-2xl border ${c.border} ${c.bg} p-5${step.number === 5 ? ' md:col-span-2' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Number badge */}
                <div className={`h-8 w-8 rounded-full ${c.badge} text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${c.text} shrink-0`} />
                    <h2 className={`font-bold text-base ${c.text}`}>{step.title}</h2>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">{step.body}</p>
                  {/* Tips */}
                  <ul className="space-y-1 mb-3">
                    {step.tips.map(tip => (
                      <li key={tip} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${c.badge} shrink-0`} />
                        {tip}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={step.href}
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${c.text} hover:underline`}
                  >
                    {step.cta} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature grid */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">All the tools at a glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {features.map(({ icon: Icon, color, name, desc }) => {
            const c = colorMap[color];
            return (
              <div key={name} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${c.text} shrink-0`} />
                  <span className={`text-xs font-bold ${c.text}`}>{name}</span>
                </div>
                <p className="text-xs text-gray-600 leading-snug">{desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips + Screenshot callout side-by-side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

      {/* Tips box */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          <h2 className="font-bold text-amber-800 text-sm">Quick tips for best results</h2>
        </div>
        <ul className="space-y-2">
          {[
            'Upload one chapter at a time — smaller files process faster and give sharper results.',
            'Use "Upload Screenshots" if your PDF is a scanned image and the text doesn\'t extract properly.',
            'Do the quiz right after reading a section while it\'s still fresh.',
            'Study at least a little every day — a 7-day streak doubles your XP.',
            'Not sure what to study next? Check your Dashboard for the "continue here" nudge.',
          ].map(tip => (
            <li key={tip} className="flex items-start gap-2 text-sm text-amber-900">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Screenshot mode callout */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 flex gap-4 items-start h-full">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Camera className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-blue-800 text-sm mb-1">Got a physical textbook?</p>
          <p className="text-sm text-blue-700 leading-relaxed">
            Open the Upload page, switch to <span className="font-semibold">Upload Screenshots</span>, and take photos of each page in order. EaseStudy will read the text from your images and create all the same study tools — quiz, flashcards, summary, everything.
          </p>
        </div>
      </div>

      </div>{/* end tips + callout grid */}

      {/* CTA */}
      <div className="text-center pb-4">
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload your first chapter
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-gray-400 mt-2">Ready in 30 seconds</p>
      </div>

    </div>
  );
}
