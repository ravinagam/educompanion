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

// Internal: what Claude actually returns (no verbatim content)
interface AISectionMarker {
  title: string;
  start_text: string; // first ~60 chars of the section in the source content
  estimated_minutes: number;
}

function buildSectionsFromMarkers(content: string, markers: AISectionMarker[]): ChapterSection[] {
  // Locate each section's start position in the original content
  const positions: number[] = markers.map((m, i) => {
    if (i === 0) return 0;
    const snippet = m.start_text.slice(0, 50).trim();
    const pos = content.indexOf(snippet);
    return pos >= 0 ? pos : Math.floor((i / markers.length) * content.length);
  });

  return markers.map((m, i) => ({
    title: m.title,
    order_index: i,
    estimated_minutes: m.estimated_minutes,
    content_text: content.slice(positions[i], i < positions.length - 1 ? positions[i + 1] : content.length).trim(),
  }));
}

export interface SectionMiniQuizQuestion {
  id: string;
  type: 'mcq' | 'true_false';
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

// Split a chapter into logical sections (called once at upload/generate time).
// Claude outputs only section titles + a short start marker; code slices the actual content.
// This keeps output tokens tiny (~500) regardless of chapter length, avoiding truncation.
export async function splitChapterIntoSections(
  chapterName: string,
  contentText: string,
): Promise<UsageResult<ChapterSection[]>> {
  const content = contentText.slice(0, 120_000);

  const prompt = `You are an expert curriculum designer for Indian school students (grades 8–12).

Identify 3–8 logical, self-contained sections in this chapter that a student can study one at a time.

Chapter: "${chapterName}"

Content:
${content}

For each section return:
- title: short descriptive title (≤ 8 words)
- start_text: copy the FIRST 60 characters EXACTLY as they appear in the content above where that section begins
- estimated_minutes: realistic reading time (5–20 min)

The first section always starts at position 0 of the content.

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "title": "Introduction to Inertia",
    "start_text": "Inertia is the tendency of an object to resist",
    "estimated_minutes": 10
  }
]`;

  const message = await getClaude().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  const markers = parseJSON<AISectionMarker[]>(text);
  const sections = buildSectionsFromMarkers(content, markers);

  return {
    data: sections,
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
- CRITICAL — Self-contained questions: Every question must make complete sense on its own. Do NOT reference "Example 13", "Figure 5", "Table 2", "the above diagram", "as shown", or any textbook-specific label the student cannot see. Embed any required data directly in the question text.

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
