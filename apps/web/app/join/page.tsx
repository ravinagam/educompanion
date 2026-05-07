'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Isolated so useSearchParams() has a Suspense boundary above it at build time
function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    if (ref) {
      localStorage.setItem('ease_ref_code', ref.toUpperCase());
      fetch(`/api/referrals/referrer?code=${encodeURIComponent(ref)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.name) setReferrerName(data.name); })
        .catch(() => {});
    }
  }, [ref]);

  return (
    <div className="w-full max-w-md text-center space-y-8">
      <div className="flex justify-center">
        <div className="flex items-center gap-2 text-blue-600">
          <BookOpen className="h-10 w-10" />
          <span className="text-3xl font-bold">EaseStudy</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-md space-y-4">
        <div className="flex justify-center">
          <div className="bg-amber-100 text-amber-600 p-4 rounded-full">
            <Gift className="h-10 w-10" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          {referrerName ? (
            <><span className="text-blue-600">{referrerName}</span> invited you!</>
          ) : (
            "You've been invited!"
          )}
        </h1>

        <p className="text-gray-600">
          {referrerName ? (
            <>{referrerName} thinks you&apos;ll love EaseStudy — the AI-powered study app for Class 8–10 students.</>
          ) : (
            <>Your friend invited you to join EaseStudy — the AI-powered study app for Class 8–10 students.</>
          )}
        </p>

        <div className="bg-blue-50 rounded-lg p-4 text-left space-y-2 text-sm text-blue-800">
          <p>✅ AI-generated quizzes, flashcards &amp; summaries</p>
          <p>✅ Smart video lessons from your textbooks</p>
          <p>✅ Earn XP and unlock Amazon vouchers</p>
          <p>✅ <strong>+100 XP welcome bonus</strong> when you join via this link</p>
        </div>

        <Button className="w-full text-base h-12" onClick={() => router.push('/auth/signup')}>
          Create Free Account →
        </Button>
        <p className="text-xs text-gray-400">
          Already have an account?{' '}
          <button className="text-blue-600 hover:underline" onClick={() => router.push('/auth/login')}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Suspense fallback={
        <div className="w-full max-w-md text-center space-y-8">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <BookOpen className="h-10 w-10" />
              <span className="text-3xl font-bold">EaseStudy</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-md">
            <div className="animate-pulse space-y-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 mx-auto" />
              <div className="h-6 bg-gray-100 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-12 bg-gray-100 rounded w-full" />
            </div>
          </div>
        </div>
      }>
        <JoinContent />
      </Suspense>
    </div>
  );
}
