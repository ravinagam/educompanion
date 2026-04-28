'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, X, Send, Loader2, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  async function submit() {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, page: pathname }),
      });
      if (res.ok) {
        toast.success('Thanks for your feedback!');
        setMessage('');
        setOpen(false);
      } else {
        toast.error('Failed to send feedback. Please try again.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all"
        title="Share feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      {/* Backdrop + panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Smile className="h-4 w-4" />
                <span className="font-semibold text-sm">Share Feedback</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">Tell us what you like, what's broken, or what you'd love to see next.</p>
              <textarea
                autoFocus
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submit(); }}
                placeholder="Your feedback here…"
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Ctrl+Enter to send</span>
                <Button
                  onClick={submit}
                  disabled={loading || !message.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-1.5 text-sm"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
