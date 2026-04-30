import Link from 'next/link';
import { BookMarked } from 'lucide-react';

export const metadata = { title: 'Terms of Use — EaseStudy' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-2 text-blue-600">
          <BookMarked className="h-6 w-6" />
          <span className="text-xl font-bold text-gray-900">EaseStudy</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Terms of Use</h1>
            <p className="text-sm text-gray-400 mt-1">Effective date: May 2025</p>
          </div>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-800">1. About EaseStudy</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              EaseStudy is a personal study tool designed to help students in grades 8–12 learn
              from their own study material using AI-generated quizzes, flashcards, and
              summaries. It is not a content distribution platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-800">2. Your Uploaded Content</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              You may only upload documents that you own, have created yourself, or have explicit
              permission to use. By uploading a file, you confirm that you have the right to use
              that material for personal study purposes.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              You must not upload copyrighted material without authorisation from the copyright
              holder. This includes, but is not limited to, commercially published textbooks,
              question papers, or any other third-party content you do not have the right to
              reproduce.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Your uploaded material is used solely to generate study aids for your personal use
              and is never shared with other users.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-800">3. Responsibility</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              You are solely responsible for ensuring that any material you upload complies with
              applicable copyright laws. EaseStudy accepts no liability for content uploaded by
              users in violation of third-party rights.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-800">4. Account Use</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Accounts are for individual student use only. You must not share your account with
              others or use the platform for any commercial purpose.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-800">5. Changes</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We may update these terms from time to time. Continued use of EaseStudy after
              changes are posted means you accept the updated terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-800">6. Contact</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              For questions about these terms, contact us at{' '}
              <a href="mailto:support@easestudy.in" className="text-blue-600 hover:underline">
                support@easestudy.in
              </a>.
            </p>
          </section>
        </div>

        <p className="text-center text-sm text-gray-400">
          <Link href="/auth/login" className="hover:underline text-blue-600">Back to EaseStudy</Link>
        </p>
      </div>
    </div>
  );
}
