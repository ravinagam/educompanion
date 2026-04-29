import Anthropic from '@anthropic-ai/sdk';
import type { QuizQuestion, VideoScriptContent, Flashcard } from '@educompanion/shared';
import { QUIZ_QUESTIONS_PER_CHAPTER, FLASHCARDS_PER_CHAPTER } from '@educompanion/shared';

let _claude: Anthropic | null = null;
function getClaude() {
  if (!_claude) _claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _claude;
}

function parseJSON<T>(text: string): T {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    console.error('[claude] Failed to parse JSON. Raw response:', text.slice(0, 300));
    throw new Error(`AI returned an unexpected response: ${text.slice(0, 120)}`);
  }
}

/**
 * Sample content from throughout the full text so generation covers ALL sections.
 * If content fits within maxChars, return it all.
 * Otherwise split into thirds and take an equal slice from start, middle, and end.
 */
function sampleContent(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text ?? '';
  const third = Math.floor(maxChars / 3);
  const mid = Math.floor(text.length / 2);
  const start  = text.slice(0, third);
  const middle = text.slice(mid - Math.floor(third / 2), mid + Math.ceil(third / 2));
  const end    = text.slice(text.length - third);
  return (
    start  +
    '\n\n[... middle of chapter ...]\n\n' +
    middle +
    '\n\n[... later in chapter ...]\n\n' +
    end
  );
}

// ─── Quiz Generation ──────────────────────────────────────────────────────────

export async function generateQuiz(
  chapterName: string,
  chapterContent: string | null | undefined,
  variationHint = '',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<QuizQuestion[]> {
  // Use up to 80k chars sampled from across the whole chapter
  const content = sampleContent(chapterContent ?? '', 80_000);

  const variationLine = variationHint
    ? `\nIMPORTANT: ${variationHint} Generate a completely fresh set of questions — different topics, angles, and phrasing from any previous generation.\n`
    : '';

  const prompt = `You are an expert teacher for Indian school students (grades 8–10).
Generate exactly ${QUIZ_QUESTIONS_PER_CHAPTER} quiz questions based ONLY on the following chapter content.
${variationLine}
Chapter: "${chapterName}"

Content:
${content}

Rules:
- Use ONLY information from the provided content. Do not add external facts.
- IMPORTANT: Cover ALL sections and topics from across the entire chapter — not just the beginning. The content above may include excerpts from start, middle, and end of the chapter.
- Mix question types: 6 MCQ, 3 True/False, 3 Fill-in-the-blank
- MCQs must have exactly 4 options (A, B, C, D)
- Every question must have a clear correct answer and a concise explanation
- Difficulty: ${difficulty === 'easy' ? '70% easy, 25% medium, 5% hard — straightforward recall questions, simple vocabulary' : difficulty === 'hard' ? '5% easy, 25% medium, 70% hard — deep conceptual reasoning, application, and analysis' : '30% easy, 50% medium, 20% hard — balanced mix'}
- Spread questions evenly across different topics/sections of the chapter

Return a JSON array with this exact schema:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A) ...",
    "explanation": "..."
  },
  {
    "id": "q2",
    "type": "true_false",
    "question": "...",
    "options": ["True", "False"],
    "correct_answer": "True",
    "explanation": "..."
  },
  {
    "id": "q3",
    "type": "fill_blank",
    "question": "The process of ___ converts sunlight into food.",
    "correct_answer": "photosynthesis",
    "explanation": "..."
  }
]

Return ONLY valid JSON, no markdown, no explanation outside the array.`;

  const message = await getClaude().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 1,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  return parseJSON<QuizQuestion[]>(text);
}

// ─── Flashcard Generation ─────────────────────────────────────────────────────

export async function generateFlashcards(
  chapterName: string,
  chapterContent: string | null | undefined,
  variationHint = ''
): Promise<Pick<Flashcard, 'term' | 'definition'>[]> {
  const content = sampleContent(chapterContent ?? '', 80_000);

  const variationLine = variationHint
    ? `\nIMPORTANT: ${variationHint} Generate a completely fresh set of flashcards — different terms and concepts from any previous generation.\n`
    : '';

  const prompt = `You are a concise teacher creating study flashcards for Indian school students (grades 8–10).

Generate exactly ${FLASHCARDS_PER_CHAPTER} flashcard pairs from ONLY the following chapter content.
${variationLine}
Chapter: "${chapterName}"

Content:
${content}

Rules:
- IMPORTANT: Extract terms from ALL sections of the chapter — beginning, middle, and end — not just the opening topics.
- Extract key terms, concepts, definitions, formulas, and important facts from the text
- Terms should be short (1–5 words)
- Definitions should be clear, accurate, and 1–2 sentences
- Do NOT invent facts not in the content
- Spread flashcards evenly across all topics covered in the chapter

Return a JSON array:
[
  { "term": "Photosynthesis", "definition": "The process by which plants use sunlight, water, and CO2 to produce glucose and oxygen." },
  ...
]

Return ONLY valid JSON, no markdown.`;

  const message = await getClaude().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    temperature: 1,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  return parseJSON<Pick<Flashcard, 'term' | 'definition'>[]>(text);
}

// ─── Video Script Generation ──────────────────────────────────────────────────

export async function generateVideoScript(
  chapterName: string,
  chapterContent: string | null | undefined
): Promise<VideoScriptContent> {
  const content = sampleContent(chapterContent ?? '', 100_000);

  const prompt = `You are creating an educational video script for Indian school students (grades 8–10).

Generate a structured video script ONLY from the content below.

Chapter: "${chapterName}"

Content:
${content}

Structure the script as JSON with this exact schema:
{
  "title": "Chapter title for the video",
  "sections": [
    {
      "id": "intro",
      "type": "intro",
      "title": "Introduction",
      "bullets": ["What this chapter covers", "Why it matters", "Key concept overview"],
      "duration_seconds": 45,
      "timestamp_seconds": 0,
      "image_queries": ["Chemistry"],
      "image_label": null
    },
    {
      "id": "topic-1",
      "type": "topic",
      "title": "Rusting of Iron",
      "bullets": ["Iron reacts with oxygen and water to form rust", "Rust is hydrated iron oxide", "Rusting weakens metal structures"],
      "duration_seconds": 90,
      "timestamp_seconds": 45,
      "image_queries": ["Iron", "Rust"],
      "image_label": "Exposure to Moisture"
    },
    ...more topics...,
    {
      "id": "summary",
      "type": "summary",
      "title": "Summary & Review",
      "bullets": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
      "duration_seconds": 60,
      "timestamp_seconds": 300,
      "image_queries": ["Chemical reaction"],
      "image_label": null
    }
  ]
}

Rules:
- IMPORTANT: Create sections covering ALL major topics from the entire chapter — beginning, middle, and end. Do not stop after the first few topics.
- Create 4–8 topic sections based on the actual content breadth
- Each bullet point is a concise, clear learning point from the content only
- Calculate timestamp_seconds cumulatively
- Total video should be 8–15 minutes (480–900 seconds)
- For image_queries: provide an array of 1 OR 2 exact Wikipedia article titles (not phrases — real article names)
  - Use 2 items when the slide shows a TRANSFORMATION or BEFORE-AFTER (e.g. reactant→product, healthy→diseased). First item = before/initial state, second item = after/result
  - Use 1 item for concept slides (definitions, overviews, processes without a clear before-after)
  - Examples of good titles: "Grapes", "Wine", "Iron", "Rust", "Photosynthesis", "Mitosis", "Atom", "Newton's laws of motion", "Water cycle", "Periodic table", "Human heart"
- For image_label: short 2-5 word phrase describing the transformation (only when image_queries has 2 items, otherwise null)
- Return ONLY valid JSON, no markdown.`;

  const message = await getClaude().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 1,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  return parseJSON<VideoScriptContent>(text);
}

// ─── Chat with Chapter ────────────────────────────────────────────────────────

export async function chatWithChapter(
  chapterName: string,
  chapterContent: string | null | undefined,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const content = sampleContent(chapterContent ?? '', 60_000);

  const systemPrompt = `You are a friendly and helpful teacher assistant for Indian school students (grades 8–10).
Answer questions using ONLY the following chapter content. If the question is not covered in the chapter, say so politely and suggest the student refer to the full chapter.
Be clear, use simple language, and give real-world examples where helpful. Keep answers concise (2–5 sentences unless a longer explanation is needed).

Chapter: "${chapterName}"

Chapter Content:
${content}`;

  const message = await getClaude().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  return (message.content[0] as { type: string; text: string }).text;
}

// ─── Chapter Summary ──────────────────────────────────────────────────────────

export interface ChapterSummary {
  quick_recap: string;
  key_points: string[];
  key_concepts: { term: string; explanation: string }[];
  exam_tips: string[];
}

export async function generateChapterSummary(
  chapterName: string,
  chapterContent: string | null | undefined
): Promise<ChapterSummary> {
  const content = sampleContent(chapterContent ?? '', 80_000);

  const prompt = `You are an expert teacher creating a concise study summary for Indian school students (grades 8–10).

Chapter: "${chapterName}"
Content:
${content}

Return a JSON object with this exact schema:
{
  "quick_recap": "2–3 sentence overview of the entire chapter",
  "key_points": ["5–8 most important points a student must remember, covering the whole chapter"],
  "key_concepts": [
    { "term": "concept name", "explanation": "clear 1-sentence explanation from the content" }
  ],
  "exam_tips": ["3–5 specific tips on what examiners typically ask from this chapter"]
}

Rules:
- Cover ALL sections (beginning, middle, end) — not just the opening topics
- Use simple, student-friendly language
- key_concepts should have 5–8 important terms/definitions from the chapter
- Return ONLY valid JSON, no markdown`;

  const message = await getClaude().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  return parseJSON<ChapterSummary>(text);
}

// ─── Targeted Practice Questions ──────────────────────────────────────────────

export async function generateTargetedQuestions(
  chapterName: string,
  chapterContent: string | null | undefined,
  wrongQuestions: string[]
): Promise<QuizQuestion[]> {
  const content = sampleContent(chapterContent ?? '', 60_000);

  const prompt = `You are an expert teacher generating targeted practice questions for an Indian school student (grades 8–10).

The student got the following questions WRONG in a quiz. Generate 5 new practice questions specifically on these weak areas.

Chapter: "${chapterName}"
Questions the student got wrong:
${wrongQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Chapter Content:
${content}

Generate exactly 5 questions focused on those weak areas. Use MCQ and True/False types only.
Return this JSON format:
[
  {
    "id": "t1",
    "type": "mcq",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A) ...",
    "explanation": "..."
  }
]
Return ONLY valid JSON array.`;

  const message = await getClaude().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    temperature: 1,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  return parseJSON<QuizQuestion[]>(text);
}

// ─── Study Plan Topic Extraction ──────────────────────────────────────────────

export async function extractTopics(
  chapterName: string,
  chapterContent: string
): Promise<string[]> {
  const prompt = `Extract the main topics/subtopics from this chapter for a study plan.

Chapter: "${chapterName}"
Content:
${chapterContent.slice(0, 5000)}

Return a JSON array of 3–8 topic strings. Example:
["Introduction to Cells", "Cell Structure", "Cell Functions", "Types of Cells"]

Return ONLY valid JSON array.`;

  const message = await getClaude().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  return parseJSON<string[]>(text);
}

/**
 * Extract study-plan sections from the FULL chapter (samples start/middle/end)
 * so no section is missed regardless of chapter length.
 */
export async function extractChapterSections(
  chapterName: string,
  chapterContent: string
): Promise<string[]> {
  const content = sampleContent(chapterContent, 12_000);

  const prompt = `You are planning a study schedule for a school student.
Extract the distinct sections/topics a student must study from this chapter.
Cover ALL parts of the chapter — beginning, middle, and end.

Chapter: "${chapterName}"
Content:
${content}

Rules:
- Return 4–8 section names that span the entire chapter
- Each section should be a clear, student-friendly topic name (3–7 words)
- Order them as they appear in the chapter
- Do NOT duplicate or combine unrelated topics

Return ONLY a JSON array of strings.
Example: ["Introduction to Acids and Bases", "pH Scale and Indicators", "Neutralisation Reactions", "Salts and Their Uses", "Corrosion and Rancidity"]`;

  const message = await getClaude().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  return parseJSON<string[]>(text);
}
