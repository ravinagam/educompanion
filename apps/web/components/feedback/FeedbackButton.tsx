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

const EMOJI_RATINGS = [
  { emoji: '😕', label: 'Bad',       value: 1 },
  { emoji: '😐', label: 'Okay',      value: 2 },
  { emoji: '🙂', label: 'Good',      value: 3 },
  { emoji: '😊', label: 'Great',     value: 4 },
  { emoji: '🤩', label: 'Excellent', value: 5 },
];

const CATEGORIES = [
  { key: 'bug',        label: '🐛 Bug' },
  { key: 'ui',         label: '🎨 UI/UX' },
  { key: 'suggestion', label: '💡 Suggestion' },
  { key: 'love',       label: '❤️ Love it' },
] as const;

type Category = typeof CATEGORIES[number]['key'];

export function FeedbackButton({ sidebar = false, apiPath = '/api/feedback' }: { sidebar?: boolean; apiPath?: string }) {
  const [open, setOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'submit' | 'history'>('submit');
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
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

  useEffect(() => {
    fetch(apiPath)
      .then(r => r.json())
      .then((data: { feedback?: MyFeedback[] }) => {
        setHasUnread(checkUnread(data.feedback ?? []));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    fetch(apiPath)
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

  function resetForm() {
    setRating(null);
    setHoverRating(null);
    setCategory(null);
    setMessage('');
  }

  async function submit() {
    if (!message.trim() && rating === null) {
      toast.error('Please rate your experience or write something');
      return;
    }
    const text = message.trim() || (rating !== null
      ? `Rating: ${EMOJI_RATINGS[rating - 1]?.label ?? rating}/5`
      : '');
    setLoading(true);
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, page: pathname, rating, category }),
      });
      if (res.ok) {
        toast.success('Thanks for your feedback!');
        resetForm();
        setOpen(false);
      } else {
        toast.error('Failed to send feedback. Please try again.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  }

  const displayRating = hoverRating ?? rating;

  return (
    <>
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
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Feedback
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white animate-pulse" />
          )}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6" onClick={() => setOpen(false)}>
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
              <div className="p-4 space-y-4">
                {/* Emoji rating */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">How's your experience?</p>
                  <div className="flex justify-between">
                    {EMOJI_RATINGS.map(({ emoji, label, value }) => (
                      <button
                        key={value}
                        onMouseEnter={() => setHoverRating(value)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setRating(r => r === value ? null : value)}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
                          displayRating === value
                            ? 'bg-indigo-50 scale-110'
                            : 'hover:bg-gray-50'
                        }`}
                        title={label}
                      >
                        <span className={`text-2xl transition-all ${
                          displayRating !== null && displayRating !== value ? 'opacity-40' : ''
                        }`}>{emoji}</span>
                        <span className={`text-[9px] font-medium transition-colors ${
                          displayRating === value ? 'text-indigo-600' : 'text-gray-300'
                        }`}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category chips */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">What's this about?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setCategory(c => c === key ? null : key)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          category === key
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Details <span className="font-normal text-gray-300">(optional)</span></p>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submit(); }}
                    placeholder="Tell us more…"
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Ctrl+Enter to send</span>
                  <Button
                    onClick={submit}
                    disabled={loading || (!message.trim() && rating === null)}
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
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1.5">
                            {new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">{f.message}</p>
                        </div>
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
