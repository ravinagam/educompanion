'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Send, Loader2, Bot, User, Lightbulb } from 'lucide-react';

// Renders AI markdown responses: bold, italic, headers, bullet/numbered lists, code, dividers.
function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  // Inline formatting: **bold**, *italic*, `code`
  function renderInline(raw: string): React.ReactNode {
    const parts = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((p, idx) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={idx}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*'))
        return <em key={idx}>{p.slice(1, -1)}</em>;
      if (p.startsWith('`') && p.endsWith('`'))
        return <code key={idx} className="bg-black/10 rounded px-1 py-0.5 font-mono text-xs">{p.slice(1, -1)}</code>;
      return p;
    });
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Heading
    const h3 = trimmed.match(/^###\s+(.+)/);
    const h2 = trimmed.match(/^##\s+(.+)/);
    const h1 = trimmed.match(/^#\s+(.+)/);
    if (h1) { elements.push(<p key={i} className="font-bold text-base mt-1">{renderInline(h1[1])}</p>); i++; continue; }
    if (h2) { elements.push(<p key={i} className="font-bold mt-1">{renderInline(h2[1])}</p>); i++; continue; }
    if (h3) { elements.push(<p key={i} className="font-semibold mt-0.5">{renderInline(h3[1])}</p>); i++; continue; }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) { elements.push(<hr key={i} className="border-current opacity-20 my-1" />); i++; continue; }

    // Bullet list — collect consecutive items
    if (/^[-*•]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-0.5 my-1 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-1.5 items-start">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-60" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list — collect consecutive items
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      let num = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-0.5 my-1 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-1.5 items-start">
              <span className="shrink-0 font-semibold opacity-70">{num++}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Plain paragraph
    elements.push(<p key={i}>{renderInline(trimmed)}</p>);
    i++;
  }

  return <div className="space-y-1 leading-relaxed text-sm">{elements}</div>;
}

interface Message { role: 'user' | 'assistant'; content: string }

interface Props {
  chapter: { id: string; name: string };
  subjectName: string;
  apiUrl?: string;          // override POST endpoint (defaults to /api/chapters/{id}/chat)
  backHref?: string;        // override back link
  contextLabel?: string;    // "this chapter" | "this section" shown in placeholder
  sectionTitle?: string;    // shown in header when scoped to a section
  initialQuestion?: string; // auto-send this question on mount
}

const STARTER_QUESTIONS = [
  'Summarise this chapter in simple words',
  'What are the most important points to remember?',
  'Give me a real-life example from this chapter',
  'What exam questions are usually asked from this chapter?',
];

export function ChapterChatClient({ chapter, subjectName, apiUrl, backHref, contextLabel = 'this chapter', sectionTitle, initialQuestion }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didSendInitial = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialQuestion && !didSendInitial.current) {
      didSendInitial.current = true;
      send(initialQuestion);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(apiUrl ?? `/api/chapters/${chapter.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to get a response');
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: json.reply }]);
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 px-5 py-4 text-white shadow-md mb-4 shrink-0">
        <Link href={backHref ?? `/chapters?subject=${encodeURIComponent(subjectName)}`} className="text-emerald-200 hover:text-white flex items-center gap-1 text-xs mb-1 transition-colors">
          <ArrowLeft className="h-3 w-3" /> {sectionTitle ? 'Back to Section' : 'My Saved Chapters'}
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">{subjectName} — {sectionTitle ?? chapter.name}</p>
            <p className="text-emerald-100 text-xs">Ask anything about {contextLabel}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {messages.length === 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm max-w-sm">
                <p className="text-sm text-gray-800">
                  Hi! I&apos;m your study assistant for <span className="font-semibold">{sectionTitle ?? chapter.name}</span>. Ask me anything about {contextLabel}!
                </p>
              </div>
            </div>

            <div className="ml-11">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Try asking:
              </p>
              <div className="flex flex-wrap gap-2">
                {STARTER_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1.5 hover:bg-emerald-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-indigo-100' : 'bg-emerald-100'
            }`}>
              {m.role === 'user'
                ? <User className="h-4 w-4 text-indigo-600" />
                : <Bot className="h-4 w-4 text-emerald-600" />}
            </div>
            <div className={`rounded-2xl px-4 py-3 shadow-sm max-w-[80%] ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none text-sm leading-relaxed'
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
            }`}>
              {m.role === 'user'
                ? m.content
                : <MarkdownMessage text={m.content} />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 border-t border-gray-100 mt-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={`Ask a question about ${contextLabel}…`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            disabled={loading}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
          />
          <Button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">Answers are based only on your uploaded chapter content</p>
      </div>
    </div>
  );
}
