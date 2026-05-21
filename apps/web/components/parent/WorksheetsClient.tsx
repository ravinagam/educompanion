'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Loader2, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { StudentTabNav } from './StudentTabNav';

export interface HindiChapter {
  id: string;
  name: string;
  subjectName: string;
}

interface Props {
  student: { id: string; name: string };
  hindiChapters: HindiChapter[];
}

export function WorksheetsClient({ student, hindiChapters }: Props) {
  const router = useRouter();
  const [generatingWorksheet, setGeneratingWorksheet] = useState<Record<string, boolean>>({});
  const [worksheetMeta, setWorksheetMeta] = useState<Record<string, string>>({});

  function openPrintWindow(html: string) {
    const w = window.open('', '_blank', 'width=820,height=720');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  function printHindiWorksheet(chapterName: string, subjectName: string, questions: { sentence: string; answer: string }[]) {
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const questionsHtml = questions.map((q, i) =>
      `<div class="question"><span class="qnum">${i + 1}.</span> ${q.sentence}</div>`
    ).join('');
    const answersHtml = questions.map((q, i) =>
      `<div class="ans-row"><span class="qnum">${i + 1}.</span> <span class="ans">${q.answer}</span></div>`
    ).join('');

    openPrintWindow(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Hindi Worksheet — ${chapterName}</title>
      <style>
        @page { margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; font-size: 14px; color: #111; padding: 40px 44px 32px; }
        .header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 32px; }
        .header h1 { font-size: 17px; font-weight: bold; }
        .header .meta { font-size: 11px; color: #555; margin-top: 4px; }
        .section-title { font-size: 13px; font-weight: bold; color: #444; margin-bottom: 18px; letter-spacing: 0.04em; text-transform: uppercase; }
        .question { padding-top: 18px; margin-bottom: 4px; line-height: 1.8; page-break-inside: avoid; }
        .qnum { font-weight: bold; margin-right: 6px; }
        .answer-key { page-break-before: always; padding-top: 40px; }
        .ans-row { padding-top: 14px; line-height: 1.6; }
        .ans { color: #166534; font-weight: 600; }
        .key-note { font-size: 11px; color: #888; margin-bottom: 24px; }
      </style></head><body>
      <div class="header">
        <h1>${chapterName} — रिक्त स्थान भरो</h1>
        <div class="meta">${subjectName} &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; ${questions.length} प्रश्न</div>
      </div>
      <div class="section-title">निर्देश: रिक्त स्थानों की पूर्ति कीजिए</div>
      ${questionsHtml}
      <div class="answer-key">
        <div class="header">
          <h1>${chapterName} — उत्तर कुंजी</h1>
          <div class="meta">${subjectName} &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; केवल अभिभावक / शिक्षक के लिए</div>
        </div>
        <p class="key-note">Answer Key — For Parent / Teacher use only. Do not share with students before they attempt the worksheet.</p>
        ${answersHtml}
      </div>
    </body></html>`);
  }

  async function generateAndPrintWorksheet(chapterId: string, chapterName: string, subjectName: string, force = false) {
    setGeneratingWorksheet(g => ({ ...g, [chapterId]: true }));
    try {
      const url = `/api/generate/quiz/${chapterId}/hindi-worksheet${force ? '?force=true' : ''}`;
      const res = await fetch(url, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? 'Generation failed'); return; }
      setWorksheetMeta(m => ({ ...m, [chapterId]: json.generated_at }));
      printHindiWorksheet(chapterName, subjectName, json.questions);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setGeneratingWorksheet(g => ({ ...g, [chapterId]: false }));
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-900">{student.name}&apos;s Worksheets</h1>
          <p className="text-xs text-gray-400">Generate and print practice worksheets</p>
        </div>
      </div>

      {/* Tab nav */}
      <StudentTabNav studentId={student.id} />

      {/* Hindi Worksheets */}
      {hindiChapters.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-3">
          <FileText className="h-10 w-10 text-gray-200 mx-auto" />
          <p className="text-sm font-medium text-gray-500">No Hindi chapters found</p>
          <p className="text-xs text-gray-400">
            Worksheets are available for Hindi subject chapters. Ask your child to upload their Hindi chapters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
            <Printer className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-800">हिंदी वर्कशीट | Hindi Worksheet</h2>
          </div>
          <div className="p-5 space-y-1">
            <p className="text-xs text-gray-500 mb-4">
              Fill-in-the-blank worksheets in Hindi. Questions print on page 1, answer key on page 2.
            </p>
            {hindiChapters.map(ch => {
              const isGenerating = !!generatingWorksheet[ch.id];
              const generatedAt = worksheetMeta[ch.id];
              const dateLabel = generatedAt
                ? new Date(generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : null;
              return (
                <div key={ch.id} className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ch.name}</p>
                    <p className="text-xs text-gray-400">
                      {ch.subjectName}
                      {dateLabel && <span className="ml-2 text-emerald-600">· Generated {dateLabel}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => generateAndPrintWorksheet(ch.id, ch.name, ch.subjectName)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                    >
                      {isGenerating
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
                        : <><Printer className="h-3.5 w-3.5" />Print Worksheet</>}
                    </button>
                    {dateLabel && (
                      <button
                        type="button"
                        onClick={() => generateAndPrintWorksheet(ch.id, ch.name, ch.subjectName, true)}
                        disabled={isGenerating}
                        title="Regenerate with new questions"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-100 hover:border-gray-300 rounded-lg px-2 py-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="h-3 w-3" /> Regenerate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
