'use client';

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { parseMathSegments } from '@/lib/utils/pdf-vision-extract';

interface MathTextProps {
  text: string;
  className?: string;
}

// Renders a string that may contain $inline$ and $$display$$ LaTeX delimiters.
// Plain text segments are rendered as-is; math segments are rendered via KaTeX.
export function MathText({ text, className }: MathTextProps) {
  const segments = useMemo(() => parseMathSegments(text), [text]);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return <span key={i}>{seg.content}</span>;
        }

        const displayMode = seg.kind === 'display-math';
        try {
          const html = katex.renderToString(seg.content, {
            displayMode,
            throwOnError: false,
            strict: false,
            trust: false,
          });
          return (
            <span
              key={i}
              className={displayMode ? 'block my-2 overflow-x-auto text-center' : 'inline'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          // Fallback: show raw LaTeX if KaTeX can't parse it
          return (
            <code key={i} className="text-xs bg-gray-100 rounded px-1 text-gray-600 font-mono">
              {seg.content}
            </code>
          );
        }
      })}
    </span>
  );
}
