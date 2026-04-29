'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, X, Send, Loader2, Smile, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MyFeedback {
  id: string;
  message: string;
  page: string | null;
  created_at: string;
  admin_response: string | null;
  admin_responded_at: string | null;
  status: string;
}

export function FeedbackButton({ sidebar = false }: { sidebar?: boolean }) {
  const [open, setOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'submit' | 'history'>('submit');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [myFeedback, setMyFeedback] = useState<MyFeedback[]>([]);
  const [fetching, setFetching] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const pathname = usePathname();

  function checkUnread(list: MyFeedback[]) {
    const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('feedbackLastSeen') : null;
    return list.some(f =>
      f.admin_response && f.admin_responded_at &&
      (!lastSeen || f.admin_responded_at > lastSeen)
    );
  }

  // Check for unread responses on mount (for the dot)
  useEffect(() => {
    fetch('/api/feedback')
      .then(r => r.json())
      .then((data: { feedback?: MyFeedback[] }) => {
        const list = data.feedback ?? [];
        setHasUnread(checkUnread(list));
      })
      .catch(() => {});
  }, []);

  // Fetch full feedback list when panel opens
  useEffect(() => {
    if (!open) return;
    setFetching(true);
    fetch('/api/feedback')
      .then(r => r.json())
      .then((data: { feedback?: MyFeedback[] }) => {
        const list = data.feedback ?? [];
        setMyFeedback(list);
        setHasUnread(checkUnread(list));
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [open]);

  function openHistory() {
    setPanelTab('history');
    localStorage.setItem('feedbackLastSeen', new Date().toISOString());
    setHasUnread(false);
  }

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
      {/* Trigger button — sidebar nav item or floating button */}
      {sidebar ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors relative"
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
          Feedback
          {hasUnread && (
            <span className="ml-auto h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all"
          title="Share feedback"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Feedback
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white animate-pulse" />
          )}
        </button>
      )}

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
                <span className="font-semibold text-sm">Feedback</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setPanelTab('submit')}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                  panelTab === 'submit' ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                Share Feedback
              </button>
              <button
                onClick={openHistory}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px relative ${
                  panelTab === 'history' ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                My Feedback
                {hasUnread && (
                  <span className="absolute top-2 right-6 h-1.5 w-1.5 rounded-full bg-red-500" />
                )}
              </button>
            </div>

            {/* Submit tab */}
            {panelTab === 'submit' && (
              <div className="p-4 space-y-3">
                <p className="text-xs text-gray-500">Tell us what you like, what&apos;s broken, or what you&apos;d love to see next.</p>
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
            )}

            {/* My Feedback tab */}
            {panelTab === 'history' && (
              <div className="max-h-80 overflow-y-auto">
                {fetching ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                  </div>
                ) : myFeedback.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No feedback submitted yet.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {myFeedback.map(f => (
                      <div key={f.id} className="space-y-2">
                        {/* User message */}
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1.5">
                            {new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">{f.message}</p>
                        </div>
                        {/* Admin response */}
                        {f.admin_response ? (
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 ml-4">
                            <p className="text-xs font-semibold text-indigo-600 mb-1.5">Team reply</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{f.admin_response}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-300 ml-4 italic">We&apos;ll get back to you soon…</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
