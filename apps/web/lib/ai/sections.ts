import Anthropic from '@anthropic-ai/sdk';
import { parseJSON } from '@/lib/ai/utils';
import type { UsageResult } from '@/lib/ai/claude';

let _claude: Anthropic | null = null;
function getClaude() {
  if (!_claude) _claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _claude;
}

export interface ChapterSection {
  title: string;
  content_text: string;
  order_index: number;
  estimated_minutes: number;
}

export interface SectionMiniQuizQuestion {
  id: string;
  type: 'mcq' | 'true_false';
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

// Split a chapter into logical sections (called once at upload time)
export async function splitChapterIntoSections(
  chapterName: string,
  contentText: string,
): Promise<UsageResult<ChapterSection[]>> {
  // Use full content — section splitting needs the whole chapter
  const content = contentText.slice(0, 120_000);

  const prompt = `You are an expert curriculum designer for Indian school students (grades 8–12).

Split the following chapter into logical, self-contained sections that a student can study one at a time.

Chapter: "${chapterName}"

Content:
${content}

Rules:
- Identify 3–8 natural sections (headings, subtopics, or concept groups)
- Each section must be genuinely self-contained — a student should understand it without reading ahead
- Titles must be short and descriptive (≤ 8 words)
- content_text must include ALL the relevant text from the chapter for that section — copy it verbatim, do not summarise
- estimated_minutes: realistic reading time (5–20 min per section, based on content length and complexity)
- order_index starts at 0

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "title": "What is Inertia?",
    "content_text": "...verbatim text from the chapter for this section...",
    "order_index": 0,
    "estimated_minutes": 10
  }
]`;

  const message = await getClaude().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  return {
    data: parseJSON<ChapterSection[]>(text),
    input_tokens: message.usage.input_tokens,
    output_tokens: message.usage.output_tokens,
    model: message.model,
  };
}

// Generate a 4-question mini-quiz for one section (called lazily on first visit)
export async function generateSectionMiniQuiz(
  chapterName: string,
  sectionTitle: string,
  sectionContent: string,
): Promise<UsageResult<SectionMiniQuizQuestion[]>> {
  const content = sectionContent.slice(0, 20_000);

  const prompt = `You are an expert teacher for Indian school students (grades 8–12).

Generate exactly 4 quiz questions for the following section of a chapter. The questions must test understanding of THIS section only.

Chapter: "${chapterName}"
Section: "${sectionTitle}"

Content:
${content}

Rules:
- Generate 3 MCQ (4 options each: A, B, C, D) and 1 True/False
- Questions must be based ONLY on the section content above
- Include a clear correct_answer and a concise explanation
- Difficulty: mix of recall and simple application

Return ONLY a JSON array, no markdown:
[
  {
    "id": "sq1",
    "type": "mcq",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A) ...",
    "explanation": "..."
  },
  {
    "id": "sq2",
    "type": "true_false",
    "question": "...",
    "options": ["True", "False"],
    "correct_answer": "True",
    "explanation": "..."
  }
]`;

  const message = await getClaude().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  return {
    data: parseJSON<SectionMiniQuizQuestion[]>(text),
    input_tokens: message.usage.input_tokens,
    output_tokens: message.usage.output_tokens,
    model: message.model,
  };
}
