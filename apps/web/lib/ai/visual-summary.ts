import Anthropic from '@anthropic-ai/sdk';
import { logAiUsage } from './usage';

let _claude: Anthropic | null = null;
function getClaude() {
  if (!_claude) _claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _claude;
}

function parseJSON<T>(text: string): T {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(stripped) as T;
}

function sampleContent(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text ?? '';
  const third = Math.floor(maxChars / 3);
  const mid = Math.floor(text.length / 2);
  return (
    text.slice(0, third) +
    '\n\n[... middle of chapter ...]\n\n' +
    text.slice(mid - Math.floor(third / 2), mid + Math.ceil(third / 2)) +
    '\n\n[... later in chapter ...]\n\n' +
    text.slice(text.length - third)
  );
}

export interface CoverCard {
  type: 'cover';
  headline: string;
  tagline: string;
  emoji: string;
}

export interface ConceptCard {
  type: 'concept';
  title: string;
  body: string;
  highlight: string;
}

export interface TimelineCard {
  type: 'timeline';
  title: string;
  events: { year: string; event: string }[];
}

export interface RememberCard {
  type: 'remember';
  title: string;
  points: string[];
}

export interface MindMapCard {
  type: 'mindmap';
  center: string;
  branches: string[];
}

export type VisualCard = CoverCard | ConceptCard | TimelineCard | RememberCard | MindMapCard;

export interface VisualSummary {
  title: string;
  cards: VisualCard[];
}

export async function generateVisualSummary(
  userId: string,
  chapterName: string,
  chapterContent: string | null | undefined
): Promise<VisualSummary> {
  const content = sampleContent(chapterContent ?? '', 60_000);

  const prompt = `You are creating a visual card-based study summary for Indian school students (grades 8–12).

Generate a set of visual infographic cards for this chapter. The cards should work like Instagram story slides — each one a quick, impactful visual summary.

Chapter: "${chapterName}"

Content:
${content}

Return a JSON object with exactly this schema:
{
  "title": "short chapter title for display",
  "cards": [
    {
      "type": "cover",
      "headline": "chapter title (≤ 8 words)",
      "tagline": "one-line chapter hook (≤ 12 words)",
      "emoji": "single relevant emoji"
    },
    {
      "type": "concept",
      "title": "Concept Name (≤ 6 words)",
      "body": "Clear 2–3 sentence explanation from the chapter",
      "highlight": "The single most important term or formula from this concept"
    },
    {
      "type": "timeline",
      "title": "Timeline or Sequence Title",
      "events": [
        { "year": "date/year/step label", "event": "what happened (≤ 10 words)" }
      ]
    },
    {
      "type": "mindmap",
      "center": "Central topic (2–4 words)",
      "branches": ["branch 1 (≤ 5 words)", "branch 2", "branch 3", "branch 4", "branch 5"]
    },
    {
      "type": "remember",
      "title": "Must Remember",
      "points": ["key fact 1 (≤ 12 words)", "key fact 2", "key fact 3", "key fact 4", "key fact 5"]
    }
  ]
}

Rules:
- Always start with exactly one "cover" card
- Always end with exactly one "remember" card
- Include 2–4 "concept" cards for key ideas in the chapter
- Include a "timeline" card ONLY if the chapter has historical events, steps, or a sequence (skip if irrelevant)
- Include exactly one "mindmap" card summarising the chapter's main idea and sub-topics
- Total cards: 6–9 (cover + concepts + optional timeline + mindmap + remember)
- Cover ALL major topics from the chapter — beginning, middle, and end
- Keep all text student-friendly and concise
- Return ONLY valid JSON, no markdown or explanation`;

  const message = await getClaude().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    temperature: 0.5,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  logAiUsage(userId, 'visual_summary', message.model, message.usage.input_tokens, message.usage.output_tokens).catch(console.error);
  return parseJSON<VisualSummary>(text);
}
